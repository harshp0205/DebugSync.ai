FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Vite uses port 5173 by default
EXPOSE 5173

# Ensure the Monaco Editor web worker can be loaded correctly
ENV VITE_DEV_SERVER_URL=http://localhost:5173

# Run npm run dev with host set to 0.0.0.0 to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
