const config = {
  port: Number(process.env.PORT ?? 2020),
  apiPrefix: (process.env.API_PREFIX ?? '/pos/proxy').replace(/\/$/, ''),
  coreApiBaseUrl: process.env.CORE_API_BASE_URL ?? 'http://localhost:1010',  jwtSecret: process.env.JWT_SECRET ?? 'replace-with-strong-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'replace-with-refresh-secret',
  branchHeader: 'x-branch-id',
};

export default config;
