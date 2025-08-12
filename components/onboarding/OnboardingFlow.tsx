'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import WelcomeStep from './steps/WelcomeStep';
import ProfileSetupStep from './steps/ProfileSetupStep';
import TeamIntroductionStep from './steps/TeamIntroductionStep';
import FirstTasksStep from './steps/FirstTasksStep';
import CompletionStep from './steps/CompletionStep';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingFlowProps {
  userProfile: any;
  invitation?: any;
  teamMembers: any[];
  initialTasks: any[];
  isNewUser: boolean;
}

const steps = [
  { id: 1, name: 'Welcome', component: WelcomeStep },
  { id: 2, name: 'Profile Setup', component: ProfileSetupStep },
  { id: 3, name: 'Meet Your Team', component: TeamIntroductionStep },
  { id: 4, name: 'Your First Tasks', component: FirstTasksStep },
  { id: 5, name: 'Get Started', component: CompletionStep },
];

export default function OnboardingFlow({
  userProfile,
  invitation,
  teamMembers,
  initialTasks,
  isNewUser
}: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [profileData, setProfileData] = useState({
    fullName: userProfile.full_name,
    phone: userProfile.phone,
    avatar: userProfile.avatar_url,
    bio: '',
    preferences: {}
  });

  const totalSteps = steps.length;
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Mark current step as skipped (but still completed)
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Update user profile to mark onboarding as complete
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: userProfile.id,
          invitationId: invitation?.id,
          profileUpdates: profileData,
          completedSteps
        })
      });

      if (response.ok) {
        // Redirect to dashboard
        router.push('/dashboard?welcome=true');
      } else {
        console.error('Failed to complete onboarding');
        // Still redirect but without welcome flag
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      router.push('/dashboard');
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {userProfile.tenant?.organization?.logo_url && (
                <img 
                  src={userProfile.tenant.organization.logo_url} 
                  alt={userProfile.tenant.organization.name}
                  className="h-8"
                />
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome to {userProfile.tenant?.organization?.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Onboarding Process
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Skip All
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{steps[currentStep - 1].name}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              userProfile={userProfile}
              invitation={invitation}
              teamMembers={teamMembers}
              initialTasks={initialTasks}
              isNewUser={isNewUser}
              profileData={profileData}
              onUpdateProfile={setProfileData}
              onNext={handleNext}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="space-x-3">
            {currentStep < totalSteps && (
              <Button
                variant="ghost"
                onClick={handleSkip}
              >
                Skip
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              className="flex items-center"
            >
              {currentStep === totalSteps ? 'Complete' : 'Next'}
              {currentStep < totalSteps && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                step.id === currentStep
                  ? 'bg-indigo-600'
                  : completedSteps.includes(step.id)
                  ? 'bg-indigo-400'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}