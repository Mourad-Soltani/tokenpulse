FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY budgets.example.json rates.example.json limits.example.json models.example.json ./

ENV NODE_ENV=production
ENV TOKENPULSE_GATEWAY_HOST=0.0.0.0
ENV TOKENPULSE_GATEWAY_PORT=8788
ENV TOKENPULSE_MOCK_UPSTREAM=1
ENV TOKENPULSE_LEDGER_DIR=/app/data/ledger
ENV TOKENPULSE_BUDGETS_PATH=/app/budgets.example.json
ENV TOKENPULSE_RATES_PATH=/app/rates.example.json
ENV TOKENPULSE_LIMITS_PATH=/app/limits.example.json
ENV TOKENPULSE_MODELS_PATH=/app/models.example.json

EXPOSE 8788

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:8788/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Token must be provided at runtime. Image default is mock-only.
CMD ["npx", "tsx", "src/gateway.ts"]
