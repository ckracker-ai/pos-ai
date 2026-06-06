import paymentConfig from '../../paymentConfig.js';

export type WebpayCreateInput = {
  buyOrder: string;
  sessionId: string;
  amount: number;
  returnUrl: string;
};

export type WebpayCreateResult = {
  token: string;
  url: string;
  buyOrder: string;
};

export type WebpayCommitResult = {
  status: string;
  buyOrder: string;
  sessionId: string;
  amount: number;
  authorizationCode: string | null;
  responseCode: number | null;
};

function webpayHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Tbk-Api-Key-Id': paymentConfig.webpayCommerceCode,
    'Tbk-Api-Key-Secret': paymentConfig.webpayApiSecret,
  };
}

export function isWebpayIntegrationConfigured(): boolean {
  return (
    paymentConfig.webpayMode === 'integration' &&
    Boolean(paymentConfig.webpayCommerceCode && paymentConfig.webpayApiSecret)
  );
}

export async function webpayCreateTransaction(input: WebpayCreateInput): Promise<WebpayCreateResult> {
  const base = paymentConfig.webpayApiBaseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
    method: 'POST',
    headers: webpayHeaders(),
    body: JSON.stringify({
      buy_order: input.buyOrder,
      session_id: input.sessionId,
      amount: input.amount,
      return_url: input.returnUrl,
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const detail = String(json.detail ?? json.error_message ?? res.status);
    throw new Error(`WEBPAY_CREATE_FAILED: ${detail}`);
  }
  const token = String(json.token ?? '');
  const url = String(json.url ?? '');
  if (!token || !url) throw new Error('WEBPAY_CREATE_FAILED: missing token/url');
  return { token, url, buyOrder: input.buyOrder };
}

export async function webpayCommitTransaction(tokenWs: string): Promise<WebpayCommitResult> {
  const base = paymentConfig.webpayApiBaseUrl.replace(/\/$/, '');
  const res = await fetch(
    `${base}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(tokenWs)}`,
    { method: 'PUT', headers: webpayHeaders() }
  );
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const detail = String(json.detail ?? json.error_message ?? res.status);
    throw new Error(`WEBPAY_COMMIT_FAILED: ${detail}`);
  }
  return {
    status: String(json.status ?? 'UNKNOWN'),
    buyOrder: String(json.buy_order ?? ''),
    sessionId: String(json.session_id ?? ''),
    amount: Number(json.amount ?? 0),
    authorizationCode:
      json.authorization_code != null ? String(json.authorization_code) : null,
    responseCode: json.response_code != null ? Number(json.response_code) : null,
  };
}

export function isWebpayAuthorized(commit: WebpayCommitResult): boolean {
  return commit.status === 'AUTHORIZED' && commit.responseCode === 0;
}
