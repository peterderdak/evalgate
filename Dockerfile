FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/eval-core/package.json packages/eval-core/package.json
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
