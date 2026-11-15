import { Onboarding } from '@/features/onboarding/Onboarding'
import { backend } from '@/lib/ipc'

/** First-run window; finishing saves `onboarded` and hides it. */
export function OnboardingSurface() {
  return <Onboarding onDone={() => void backend.finishOnboarding()} />
}
