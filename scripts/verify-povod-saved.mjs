// Retained command entry point; shared browser coverage now verifies real Detail navigation.
process.argv.push('--only=saved', '--no-capture');
if (!process.argv.some(argument => argument.startsWith('--output='))) process.argv.push('--output=artifacts/ui-povod-v1/saved/verification');
await import('./verify-povod-integrated.mjs');
