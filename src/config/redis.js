import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config()

const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected.");
});

redis.on("ready", () => {
  console.log("Redis ready.");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

redis.on("close", () => {
  console.log("Redis connection closed.");
});

export default redis;