// Retained state capture interface; uses the integrated browser harness and all state actions.
process.argv.push('--only=states', '--layout=legacy-states');
if (!process.argv.some(argument => argument.startsWith('--output='))) process.argv.push('--output=artifacts/ui-povod-v1/states');
await import('./verify-povod-integrated.mjs');
