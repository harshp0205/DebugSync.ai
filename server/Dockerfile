# Base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (both dev + prod)
RUN npm install

# Copy rest of the code
COPY . .

# Expose the backend port — you said earlier 4040 (double check in your server.js / index.js)
EXPOSE 3000

# Run in dev mode (nodemon)
CMD ["npm", "run", "dev"]