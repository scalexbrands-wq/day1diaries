// Expo inlines EXPO_PUBLIC_* vars from .env at build time — no extra
// config needed. Falls back to the production values (see ../.env) so
// the app still works if env loading is ever skipped.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://d3jxtvhku6fksg.cloudfront.net'
export const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || 'l4g35ol0f0cb8m4h2oftak0ho'
export const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION || 'ap-south-1'
