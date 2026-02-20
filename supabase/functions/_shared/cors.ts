const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bluedrumai.com',
  'https://www.bluedrumai.com',
  'https://alimonyai.vercel.app',
  'https://alimonyai.netlify.app',
]

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    ...(isAllowed ? { 'Vary': 'Origin' } : {}),
  }
}
