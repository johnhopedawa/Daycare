import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mobileAppDir = path.resolve(scriptDir, '..');
const frontendDir = path.resolve(mobileAppDir, '..', 'frontend');

loadEnv({ path: path.join(mobileAppDir, '.env') });
loadEnv({ path: path.join(mobileAppDir, '.env.local'), override: true });

const mobileApiUrl = process.env.MOBILE_API_URL?.trim();
const mobileDefaultMode = process.env.MOBILE_DEFAULT_MODE?.trim() || 'portal';
const mobilePublicBaseUrl = process.env.MOBILE_PUBLIC_BASE_URL?.trim() || '';
const mobilePortalBaseUrl = process.env.MOBILE_PORTAL_BASE_URL?.trim() || '';

if (!mobileApiUrl) {
  console.error('MOBILE_API_URL is required. Set it in mobile-app/.env or mobile-app/.env.local before building.');
  process.exit(1);
}

const env = {
  ...process.env,
  BUILD_PATH: 'build-mobile',
  REACT_APP_API_URL: mobileApiUrl,
  REACT_APP_DEFAULT_MODE: mobileDefaultMode,
  REACT_APP_MOBILE_APP: 'true',
};

if (mobilePublicBaseUrl) {
  env.REACT_APP_PUBLIC_BASE_URL = mobilePublicBaseUrl;
}

if (mobilePortalBaseUrl) {
  env.REACT_APP_PORTAL_BASE_URL = mobilePortalBaseUrl;
}

const child = spawn('npm run build', {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
