import redis from "../config/redis.js";

export const getCache = async (key) => {
  try {
    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(`Cache GET error [${key}]:`, error);

    // Cache failure should never break the application.
    return null;
  }
};

export const setCache = async (key, data, ttl = 60) => {
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (error) {
    console.error(`Cache SET error [${key}]:`, error);
  }
};


export const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache DELETE error [${key}]:`, error);
  }
};