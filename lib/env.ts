export const env = {
  DATABASE_URL: getEnvValue("DATABASE_URL"),
  DATABASE_AUTH_TOKEN: getEnvValue("DATABASE_AUTH_TOKEN"),
  PLAID_ENV: getEnvValue("PLAID_ENV"),
  PLAID_CLIENT_ID: getEnvValue("PLAID_CLIENT_ID"),
  PLAID_SECRET: getEnvValue("PLAID_SECRET"),
} as const;

function getEnvValue(key: string) {
  const value =
    process.env.MODE === "development"
      ? process.env[key]
      : process.env[`PROD_${key}`];

  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}
