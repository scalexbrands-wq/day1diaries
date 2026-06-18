# ── Day1 Diaries API — Docker image ──────────────────────────
# Debian-based (not alpine) — @sparticuz/chromium (used for certificate
# PDF/PNG rendering) needs glibc, which musl-based alpine doesn't have.
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
