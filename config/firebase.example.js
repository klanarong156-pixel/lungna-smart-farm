// Not wired into this static dashboard. Configure a trusted backend before enabling Firebase.
// Never put service-account private keys or privileged credentials in GitHub Pages.
export const firebaseExample = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  domains: ['farm', 'finance', 'harvest', 'weather', 'users', 'settings'],
  relayStateIsController: false,
};
