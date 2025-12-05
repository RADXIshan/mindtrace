import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Custom hook to handle unsaved changes with navigation blocking
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @param {Function} onNavigationAttempt - Callback when navigation is attempted with unsaved changes
 */
export const useUnsavedChanges = (hasUnsavedChanges, onNavigationAttempt) => {
  // Block internal navigation using React Router's useBlocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === "blocked") {
      onNavigationAttempt(blocker);
    }
  }, [blocker, onNavigationAttempt]);

  // Block browser navigation (back/forward buttons, closing tab)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
};
