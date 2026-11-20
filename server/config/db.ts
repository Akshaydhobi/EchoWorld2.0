import mongoose from 'mongoose';

export type StorageMode = 'mongodb' | 'memory-fallback';

let activeStorageMode: StorageMode = 'memory-fallback';

export function getStorageMode(): StorageMode {
  return activeStorageMode;
}

/**
 * Connects to MongoDB when MONGO_URI is provided.
 * If MONGO_URI is omitted or unreachable during local zero-cost onboarding,
 * the server falls back to an in-memory store so EchoWorld still runs immediately.
 */
export async function connectDatabase(): Promise<StorageMode> {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    activeStorageMode = 'memory-fallback';
    console.log(
      '[EchoWorld DB] MONGO_URI not set. Running in built-in memory-fallback mode (set MONGO_URI in .env to persist to MongoDB).',
    );
    return activeStorageMode;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000,
    });
    activeStorageMode = 'mongodb';
    console.log('[EchoWorld DB] Connected to MongoDB via Mongoose.');
    return activeStorageMode;
  } catch (error) {
    activeStorageMode = 'memory-fallback';
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : 'Unknown connection error';
    const safeMessage = message.replace(
      /(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi,
      '$1[credentials-redacted]@',
    );
    console.error(
      `[EchoWorld DB] MongoDB connection failed (${safeMessage}). Running in memory-fallback mode. Check MONGO_URI, Atlas database-user credentials, and Network Access IP allowlist.`,
    );
    return activeStorageMode;
  }
}
