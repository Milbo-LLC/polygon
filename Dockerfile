FROM node:lts-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g pnpm
RUN pnpm config set store-dir /.pnpm-store

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
COPY sst-env.d.ts* ./
# Create .npmrc to configure pnpm
RUN echo "node-linker=hoisted" > .npmrc
# Run install with additional flags
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If static pages need linked resources
# ARG SST_RESOURCE_MyResource

RUN pnpm build

# Stage 3: Production server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]