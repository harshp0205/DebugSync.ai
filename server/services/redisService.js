// server/services/redisService.js
const Redis = require("redis");

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

module.exports = { redisClient, connectRedis };
