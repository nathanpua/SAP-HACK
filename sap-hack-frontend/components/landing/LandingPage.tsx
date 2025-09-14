"use client";

import React, { useEffect } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Features from "./Features";
import FeaturesShowcase from "./FeaturesShowcase";

const LandingPage = () => {
  useEffect(() => {
    // Smooth scrolling for anchor links
    const handleAnchorClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.hash && target.hash.startsWith('#')) {
        e.preventDefault();
        const element = document.querySelector(target.hash);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };

    // Add event listeners to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', handleAnchorClick);
    });

    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <main>
        <Hero />
        <FeaturesShowcase />
        <Features />
      </main>
      <footer className="bg-gray-900 dark:bg-gray-800 text-white py-12">
        <div className="section-container">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ready to Transform Your SAP Career?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Join thousands of SAP professionals who are advancing their careers with Deep SAP&apos;s AI-powered platform.
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started Free
            </a>
          </div>

          <div className="border-t border-gray-700 dark:border-gray-600 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SH</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">SAP Hack</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                © 2024 SAP Hack. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
