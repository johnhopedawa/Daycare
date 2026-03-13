import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const cwd = process.cwd();
const require = createRequire(import.meta.url);
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
const programFiles = process.env.ProgramFiles || 'C:\\Program Files';

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate)) || '';
}

function prependPath(entries) {
  const current = process.env.Path || process.env.PATH || '';
  const filtered = entries.filter(Boolean);
  const merged = [...filtered, current].filter(Boolean).join(path.delimiter);
  process.env.Path = merged;
  process.env.PATH = merged;
}

function ensureDirectory(dirPath) {
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function removeGeneratedAutolinkingOutputs(projectDir) {
  const generatedPaths = [
    path.join(projectDir, 'android', 'build', 'generated', 'autolinking'),
    path.join(projectDir, 'android', 'app', 'build', 'generated', 'autolinking'),
  ];

  for (const generatedPath of generatedPaths) {
    if (!existsSync(generatedPath)) {
      continue;
    }

    rmSync(generatedPath, { recursive: true, force: true });
  }
}

const androidSdkPath = firstExisting([
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(localAppData, 'Android', 'Sdk'),
]);

const javaHomePath = firstExisting([
  process.env.JAVA_HOME,
  path.join(programFiles, 'Android', 'Android Studio', 'jbr'),
]);

if (!androidSdkPath) {
  console.error('Android SDK not found. Install it with Android Studio or set ANDROID_HOME/ANDROID_SDK_ROOT.');
  process.exit(1);
}

if (!javaHomePath) {
  console.error('Android Studio JBR not found. Install Android Studio or set JAVA_HOME.');
  process.exit(1);
}

process.env.ANDROID_HOME = androidSdkPath;
process.env.ANDROID_SDK_ROOT = androidSdkPath;
process.env.JAVA_HOME = javaHomePath;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

prependPath([
  path.join(androidSdkPath, 'platform-tools'),
  path.join(androidSdkPath, 'emulator'),
  path.join(javaHomePath, 'bin'),
]);

const localPropertiesPath = path.join(cwd, 'android', 'local.properties');
const escapedSdkPath = androidSdkPath.replace(/\\/g, '\\\\');
writeFileSync(localPropertiesPath, `sdk.dir=${escapedSdkPath}\n`, 'utf8');
removeGeneratedAutolinkingOutputs(cwd);

console.log(`Using ANDROID_HOME=${androidSdkPath}`);
console.log(`Using JAVA_HOME=${javaHomePath}`);

const expoCliPath = require.resolve('expo/bin/cli');
const args = [expoCliPath, 'run:android', ...process.argv.slice(2)];
let workingDir = cwd;

function cleanupAndExit(code) {
  process.exit(code ?? 0);
}

if (process.platform === 'win32') {
  const shortWorkspaceRoot = ensureDirectory(path.join(homeDir, '.daycare-native-mobile'));
  const shortTempRoot = ensureDirectory(path.join(shortWorkspaceRoot, 'tmp'));
  const shortGradleHome = ensureDirectory(path.join(shortWorkspaceRoot, 'gradle'));

  process.env.TEMP = shortTempRoot;
  process.env.TMP = shortTempRoot;
  process.env.GRADLE_USER_HOME = shortGradleHome;

  console.log(`Using TEMP=${shortTempRoot}`);
  console.log(`Using GRADLE_USER_HOME=${shortGradleHome}`);
}

const child = spawn(process.execPath, args, {
  cwd: workingDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error.message);
  cleanupAndExit(1);
});

child.on('exit', (code) => {
  cleanupAndExit(code);
});
