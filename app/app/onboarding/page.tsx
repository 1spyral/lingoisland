import { Suspense } from "react";
import JourneyOnboardingFlow from "@/components/Onboarding/JourneyOnboardingFlow";
import AppPageLoading from "@/components/app/AppPageLoading";

export default function AppOnboardingPage() {
  return (
    <Suspense fallback={<AppPageLoading className="bg-[#EAF6FB]" />}>
      <JourneyOnboardingFlow />
    </Suspense>
  );
}
