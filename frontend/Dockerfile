FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=1
# На 15G диске временный swap-файл внутри build только забивает место (ENOSPC).
ENV NODE_OPTIONS=--max-old-space-size=512
ARG NEXT_PUBLIC_BACKEND_URL=
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_API_BASE_PATH=
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_API_BASE_PATH=$NEXT_PUBLIC_API_BASE_PATH

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache nginx \
  && mkdir -p /run/nginx \
  && rm -f /etc/nginx/http.d/default.conf

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker/nginx.conf /etc/nginx/http.d/game.conf
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 7790

CMD ["/entrypoint.sh"]
