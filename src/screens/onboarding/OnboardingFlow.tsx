import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import OnboardingScreen1 from './OnboardingScreen1';
import OnboardingScreen2 from './OnboardingScreen2';

interface Props {
  onComplete: () => void;
}

type OnboardingStep = 'splash' | 'onboarding1' | 'onboarding2';

const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('splash');

  const handleSplashComplete = () => {
    setCurrentStep('onboarding1');
  };

  const handleOnboarding1Next = () => {
    setCurrentStep('onboarding2');
  };

  const handleOnboarding2Complete = () => {
    onComplete();
  };

  switch (currentStep) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
    case 'onboarding1':
      return <OnboardingScreen1 onNext={handleOnboarding1Next} />;
    case 'onboarding2':
      return <OnboardingScreen2 onComplete={handleOnboarding2Complete} />;
    default:
      return <SplashScreen onComplete={handleSplashComplete} />;
  }
};

export default OnboardingFlow;