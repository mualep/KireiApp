import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client using environment variables
export const redis = Redis.fromEnv();
