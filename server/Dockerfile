FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Only expose one port now
EXPOSE 3000

# Use nodemon for development (hot reloading)
CMD ["npm", "run", "dev"]
