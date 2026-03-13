import { getRoleHomeRouteName } from '../src/navigation/roleRoutes';
import { loginWithPassword } from '../src/services/auth';
import { UserRole } from '../src/types/domain';

interface RoleCredentialSet {
  role: UserRole;
  email: string;
  password: string;
}

function getArgumentValue(flag: string) {
  const flagIndex = process.argv.indexOf(flag);
  if (flagIndex === -1) {
    return '';
  }

  return process.argv[flagIndex + 1] || '';
}

function readBaseUrl() {
  return (
    process.env.LOCAL_API_BASE_URL ||
    getArgumentValue('--api') ||
    process.env.EXPO_PUBLIC_API_URL ||
    ''
  ).trim();
}

async function verifyRole(baseUrl: string, credentials: RoleCredentialSet) {
  const session = await loginWithPassword(baseUrl, credentials.email, credentials.password);
  const expectedRoute = getRoleHomeRouteName(credentials.role);

  if (session.user.role !== credentials.role) {
    throw new Error(
      `Expected ${credentials.role} for ${credentials.email} but received ${session.user.role}`
    );
  }

  return {
    email: credentials.email,
    role: session.user.role,
    route: expectedRoute,
  };
}

async function main() {
  const baseUrl = readBaseUrl();
  if (!baseUrl) {
    throw new Error('Provide LOCAL_API_BASE_URL, EXPO_PUBLIC_API_URL, or --api.');
  }

  const credentialSets: RoleCredentialSet[] = [
    {
      role: 'ADMIN',
      email: getArgumentValue('--admin-email') || 'admin@test.com',
      password: getArgumentValue('--admin-password') || 'password123',
    },
    {
      role: 'EDUCATOR',
      email: getArgumentValue('--educator-email') || 'educator@test.com',
      password: getArgumentValue('--educator-password') || 'password123',
    },
    {
      role: 'PARENT',
      email: getArgumentValue('--parent-email') || 'parent@test.com',
      password: getArgumentValue('--parent-password') || 'password123',
    },
  ];

  const results = [];
  for (const credentialSet of credentialSets) {
    results.push(await verifyRole(baseUrl, credentialSet));
  }

  console.log(`Verified native auth against ${baseUrl}`);
  for (const result of results) {
    console.log(`${result.role}: ${result.email} -> ${result.route}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
