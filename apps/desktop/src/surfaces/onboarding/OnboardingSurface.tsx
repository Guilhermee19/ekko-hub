import { Onboarding } from '@/features/onboarding/Onboarding'
import { backend } from '@/lib/ipc'

/** First-run window; finishing saves `onboarded`, hides it and greets from the chosen mode. */
export function OnboardingSurface() {
  return (
    <Onboarding
      onDone={() => {
        void backend.finishOnboarding().then(() => backend.summon())
      }}
    />
  )
}
