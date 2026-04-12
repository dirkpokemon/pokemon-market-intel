FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

    # Install dependencies
    COPY package.json package-lock.json* ./
    RUN npm config set fetch-retry-maxtimeout 120000 && \
        npm config set fetch-retry-mintimeout 10000 && \
        npm config set fetch-retries 5 && \
        npm install --legacy-peer-deps --verbose || echo "Install completed with warnings"

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments (Railway: set as service variables so they are passed as build args)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PRICE_PAID
ARG NEXT_PUBLIC_STRIPE_PRICE_PRO
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PRICE_PAID=${NEXT_PUBLIC_STRIPE_PRICE_PAID}
ENV NEXT_PUBLIC_STRIPE_PRICE_PRO=${NEXT_PUBLIC_STRIPE_PRICE_PRO}

# Next.js builds are memory-heavy; limit webpack parallelism and cap V8 heap to reduce OOM on small builders.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_LOW_MEMORY=1
ENV NODE_OPTIONS=--max-old-space-size=3072

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=${PORT:-3000}
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "PORT=${PORT:-3000} node server.js"]
