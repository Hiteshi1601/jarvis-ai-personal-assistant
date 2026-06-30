# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY prisma ./prisma
RUN npm run prisma:generate
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
