'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Rocket, BookOpen, MessageSquare, Settings } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface CompletionStepProps {
  userProfile: any;
  onNext: () => void;
}

export default function CompletionStep({ 
  userProfile,
  onNext 
}: CompletionStepProps) {
  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          You're All Set! 🎉
        </h1>
        
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Congratulations, {userProfile.full_name}! You've completed your onboarding.
          You're now ready to start making an impact at {userProfile.tenant?.organization?.name}.
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions to Get Started</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Rocket className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Go to Dashboard</h3>
                <p className="text-sm text-gray-600">
                  View your initiatives and start working
                </p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/help'}
              className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Documentation</h3>
                <p className="text-sm text-gray-600">
                  Learn how to use all features
                </p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = `/chat`}
              className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Team Chat</h3>
                <p className="text-sm text-gray-600">
                  Connect with your colleagues
                </p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/settings/profile'}
              className="flex items-start space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Settings</h3>
                <p className="text-sm text-gray-600">
                  Customize your preferences
                </p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message from Manager */}
      {userProfile.area?.manager && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              A message from your manager
            </h3>
            <p className="text-sm text-gray-600 italic">
              "Welcome to the team! I'm excited to have you join us. 
              Feel free to reach out if you have any questions or need help getting started. 
              Looking forward to working with you!"
            </p>
            <p className="text-sm text-gray-600 mt-3">
              - {userProfile.area.manager.full_name}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Helpful Resources
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/help/getting-started" className="text-indigo-600 hover:text-indigo-800">
                → Getting Started Guide
              </a>
            </li>
            <li>
              <a href="/help/best-practices" className="text-indigo-600 hover:text-indigo-800">
                → Best Practices
              </a>
            </li>
            <li>
              <a href="/help/faq" className="text-indigo-600 hover:text-indigo-800">
                → Frequently Asked Questions
              </a>
            </li>
            <li>
              <a href="/support" className="text-indigo-600 hover:text-indigo-800">
                → Contact Support
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
        <Button
          size="lg"
          onClick={onNext}
          className="px-8"
        >
          Start Using {userProfile.tenant?.organization?.name} Dashboard
        </Button>
        
        <p className="text-sm text-gray-500 mt-4">
          You can always revisit this onboarding from your profile settings
        </p>
      </div>
    </div>
  );
}