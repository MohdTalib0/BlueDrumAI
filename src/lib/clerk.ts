/**
 * Clerk configuration
 * Initialize Clerk with your publishable key
 */
import { ClerkProvider } from '@clerk/clerk-react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is not set. Authentication will not work.')
}

export { ClerkProvider }
export const clerkPubKeyValue = clerkPubKey || ''

