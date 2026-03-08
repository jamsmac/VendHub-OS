/**
 * Test script to simulate the full login flow against Railway DB
 * to identify the exact NOT NULL violation.
 */
import dataSource from "../src/database/typeorm.config";
import * as crypto from "crypto";

(async () => {
  try {
    await dataSource.initialize();
    console.log("Connected to DB");

    const userRepo = dataSource.getRepository("User");
    const sessionRepo = dataSource.getRepository("UserSession");
    const attemptRepo = dataSource.getRepository("LoginAttempt");

    // Step 1: Find user with organization relation
    console.log("\n--- Step 1: findOne with relations ---");
    const user = await userRepo.findOne({
      where: { email: "admin@vendhub.uz" },
      relations: ["organization"],
    });

    if (!user) {
      console.log("User not found!");
      process.exit(1);
    }
    console.log("OK - User found:", user.id, user.email, user.status);

    // Step 2: Save user (success path - reset login attempts)
    console.log("\n--- Step 2: userRepository.save (success path) ---");
    user.loginAttempts = 0;
    user.lockedUntil = undefined as unknown as Date;
    user.lastLoginAt = new Date();
    user.lastLoginIp = "127.0.0.1";

    try {
      await userRepo.save(user);
      console.log("OK - User saved");
    } catch (err: unknown) {
      const e = err as Error & { query?: string; driverError?: unknown };
      console.error("FAILED - User save:", e.message);
      console.error("Query:", e.query);
      console.error("Driver:", JSON.stringify(e.driverError, null, 2));
      process.exit(1);
    }

    // Step 3: Create session
    console.log("\n--- Step 3: createSession ---");
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = sessionRepo.create({
      userId: user.id,
      refreshTokenHash: tokenHash,
      refreshTokenHint: tokenHash.substring(0, 16),
      deviceInfo: { os: "test", browser: "curl" },
      ipAddress: "127.0.0.1",
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    let sessionId: string;
    try {
      const saved = await sessionRepo.save(session);
      sessionId = saved.id;
      console.log("OK - Session created:", saved.id);
    } catch (err: unknown) {
      const e = err as Error & { query?: string; driverError?: unknown };
      console.error("FAILED - Session create:", e.message);
      console.error("Query:", e.query);
      console.error("Driver:", JSON.stringify(e.driverError, null, 2));
      process.exit(1);
    }

    // Step 4: Update session (generateTokens does this)
    console.log("\n--- Step 4: sessionRepository.update (generateTokens) ---");
    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

    try {
      await sessionRepo.update(sessionId!, {
        refreshTokenHash: newTokenHash,
        refreshTokenHint: newTokenHash.substring(0, 16),
      });
      console.log("OK - Session updated");
    } catch (err: unknown) {
      const e = err as Error & { query?: string; driverError?: unknown };
      console.error("FAILED - Session update:", e.message);
      console.error("Query:", e.query);
      console.error("Driver:", JSON.stringify(e.driverError, null, 2));
      process.exit(1);
    }

    // Step 5: Log login attempt
    console.log("\n--- Step 5: logLoginAttempt ---");
    const attempt = attemptRepo.create({
      email: "admin@vendhub.uz",
      ipAddress: "127.0.0.1",
      userAgent: "test-script",
      success: true,
      userId: user.id,
    });

    try {
      const savedAttempt = await attemptRepo.save(attempt);
      console.log("OK - Login attempt logged:", savedAttempt.id);
      // Clean up
      await attemptRepo.delete(savedAttempt.id);
    } catch (err: unknown) {
      const e = err as Error & { query?: string; driverError?: unknown };
      console.error("FAILED - Login attempt:", e.message);
      console.error("Query:", e.query);
      console.error("Driver:", JSON.stringify(e.driverError, null, 2));
      process.exit(1);
    }

    // Clean up session
    await sessionRepo.delete(sessionId!);
    console.log("\nAll 5 steps passed! Login flow should work.");

    await dataSource.destroy();
    process.exit(0);
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("FATAL:", e.message);
    console.error("Stack:", e.stack);
    process.exit(1);
  }
})();
