/**
 * All UI strings live here (English). To add French later, add a second object
 * with the same keys and pick one by language. Never use the em dash character.
 */
export const S = {
  tabs: { sets: 'Sets', live: 'Live', library: 'Library', practice: 'Practice' },
  titles: { sets: 'Sets', live: 'Live', library: 'Library', practice: 'Practice', settings: 'Settings', wheel: 'Camelot wheel' },
  demoBadge: 'DEMO',
  demoHint: 'Demo library: fictional tracks so you can try everything before your first sync.',
  openSettings: 'Open settings',
  openWheel: 'Open Camelot wheel',
  close: 'Close',
  comingSoon: 'Being built',
  offline: 'Offline · using your saved library',
  updateReady: 'New version installed · reload to use it',

  // Empty states
  emptyLibrary: 'No tracks yet',
  emptyLibraryHint: 'Turn on demo mode or connect your library sync in Settings.',
  noKeyHint: 'Add your Claude API key in Settings to use this.',

  // Settings
  settings: {
    sync: 'Library sync',
    syncRepo: 'Data repo (owner/name)',
    syncToken: 'Read-only token',
    test: 'Test connection',
    ai: 'AI (Claude)',
    mix: 'Mix defaults',
    overlap: 'Mix overlap per transition (seconds)',
    maxPitch: 'Max pitch (%)',
    keylock: 'Keylock on',
    recentDays: 'Recently played penalty (days)',
    demo: 'Demo library',
    demoAuto: 'Auto',
    demoOn: 'On',
    demoOff: 'Off',
    sounds: 'Click sounds',
    backup: 'Backup',
    about: 'About',
  },
} as const
