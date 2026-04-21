FROM node:25-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "waitlist.js"]