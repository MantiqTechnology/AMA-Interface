FROM node:22-alpine

WORKDIR /app

# Install pnpm secara global
RUN npm install -g pnpm@10.17.1

# Salin manifest dan folder scripts (diperlukan untuk script postinstall)
COPY package.json pnpm-lock.yaml* ./
COPY scripts ./scripts

# Install dependensi (postinstall sekarang akan menemukan script patch)
RUN pnpm install --no-frozen-lockfile

# Salin seluruh source code project lainnya
COPY . .

# Generate types Nuxt
RUN pnpm nuxi prepare

EXPOSE 3000

CMD ["pnpm", "dev"]