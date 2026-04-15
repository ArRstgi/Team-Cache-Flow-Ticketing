FROM node:25-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install redis
COPY . .
CMD ["node", "fraudDetection.js"]