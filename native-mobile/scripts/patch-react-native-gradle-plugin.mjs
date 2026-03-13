import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const gradleSettingsPath = path.join(
  process.cwd(),
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'settings.gradle.kts',
);

const autolinkingTaskPath = path.join(
  process.cwd(),
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'react-native-gradle-plugin',
  'src',
  'main',
  'kotlin',
  'com',
  'facebook',
  'react',
  'tasks',
  'GenerateAutolinkingNewArchitecturesFileTask.kt',
);

const reactNativeApplicationCmakePath = path.join(
  process.cwd(),
  'node_modules',
  'react-native',
  'ReactAndroid',
  'cmake-utils',
  'ReactNative-application.cmake',
);

function patchFile(filePath, transforms) {
  if (!existsSync(filePath)) {
    console.warn(`Patch target not found: ${filePath}`);
    return;
  }

  let content = readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { current, replacement, description } of transforms) {
    if (content.includes(replacement)) {
      console.log(`${description} already patched.`);
      continue;
    }
    if (!content.includes(current)) {
      console.warn(`${description} snippet not found in ${filePath}`);
      continue;
    }
    content = content.replace(current, replacement);
    console.log(`Patched ${description}.`);
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf8');
  }
}

patchFile(gradleSettingsPath, [
  {
    current: `plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }`,
    replacement: `plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }`,
    description: 'React Native Gradle plugin foojay resolver version',
  },
]);

patchFile(autolinkingTaskPath, [
  {
    current: `        set(CMAKE_VERBOSE_MAKEFILE on)\n`,
    replacement: `        set(CMAKE_VERBOSE_MAKEFILE on)\n        set(CMAKE_OBJECT_PATH_MAX 128)\n`,
    description: 'React Native autolinking CMake object path limit',
  },
]);

patchFile(reactNativeApplicationCmakePath, [
  {
    current: `set(CMAKE_VERBOSE_MAKEFILE on)\n`,
    replacement: `set(CMAKE_VERBOSE_MAKEFILE on)\nset(CMAKE_OBJECT_PATH_MAX 128)\n`,
    description: 'React Native application CMake object path limit',
  },
]);
