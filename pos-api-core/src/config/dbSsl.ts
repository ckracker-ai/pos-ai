/** RDS (y cualquier MySQL remoto) debe ir con TLS. Local Docker no. */
export function resolveDbSsl(): { rejectUnauthorized: boolean } | undefined {
  const flag = String(process.env.DB_SSL ?? '').trim().toLowerCase();
  if (flag !== 'true' && flag !== '1' && flag !== 'required') return undefined;
  return {
    rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false',
  };
}
