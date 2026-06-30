# Build stage
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN apt-get update && apt-get install -y openssl
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN apt-get update && apt-get install -y openssl
RUN npm run prisma:generate
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
