import { config } from "dotenv";
config({ path: ".env.local" });

import { hash } from "bcryptjs";

// Dynamic imports ensure dotenv loads before db module is evaluated
const { db } = await import("./index");
const { users, apiKeys, apiLogs, userCredits, creditTransactions } =
  await import("./schema");

async function seed() {
  console.log("🌱 Seeding database...\n");

  try {
    await db.delete(creditTransactions);
    await db.delete(apiLogs);
    await db.delete(apiKeys);
    await db.delete(userCredits);
    await db.delete(users);
    console.log("✓ Cleared existing data\n");

    const adminPassword = await hash("admin123", 10);
    const userPassword = await hash("user123", 10);

    // Deterministic IDs so re-seeding doesn't invalidate existing dev tokens
    const adminId = "9afaef50-2a7f-555e-be9a-b9df41098719";
    const user1Id = "6df566ae-c371-5cc0-92ea-4f9095c2a81e";
    const user2Id = "2a4caa1c-a8b4-5eb5-b038-b158a7836c1f";

    const [admin] = await db
      .insert(users)
      .values({
        id: adminId,
        name: "Admin User",
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
      })
      .returning();

    const [user1] = await db
      .insert(users)
      .values({
        id: user1Id,
        name: "John Doe",
        email: "john@example.com",
        password: userPassword,
        role: "user",
      })
      .returning();

    const [user2] = await db
      .insert(users)
      .values({
        id: user2Id,
        name: "Jane Smith",
        email: "jane@example.com",
        password: userPassword,
        role: "user",
      })
      .returning();

    console.log("✓ Created 3 users\n");

    await db.insert(userCredits).values([
      {
        userId: admin.id,
        balance: 1000000,
        totalPurchased: 1000000,
        totalSpent: 0,
      },
      {
        userId: user1.id,
        balance: 500000,
        totalPurchased: 750000,
        totalSpent: 250000,
      },
      {
        userId: user2.id,
        balance: 250000,
        totalPurchased: 500000,
        totalSpent: 250000,
      },
    ]);
    console.log("✓ Created credits for 3 users\n");

    const [apiKey1] = await db
      .insert(apiKeys)
      .values({
        userId: user1.id,
        name: "Production Key",
        key: "dra_prod_" + crypto.randomUUID().replace(/-/g, ""),
        lastUsed: new Date(Date.now() - 86400000),
      })
      .returning();

    const [apiKey2] = await db
      .insert(apiKeys)
      .values({
        userId: user1.id,
        name: "Development Key",
        key: "dra_dev_" + crypto.randomUUID().replace(/-/g, ""),
      })
      .returning();

    const [apiKey3] = await db
      .insert(apiKeys)
      .values({
        userId: user2.id,
        name: "Personal Project",
        key: "dra_pers_" + crypto.randomUUID().replace(/-/g, ""),
        lastUsed: new Date(Date.now() - 172800000),
      })
      .returning();

    console.log("✓ Created 3 API keys\n");

    const logs = [
      {
        userId: user1.id,
        apiKeyId: apiKey1.id,
        model: "gpt-4",
        provider: "openai",
        inputTokens: 150,
        outputTokens: 320,
        cost: 12500,
        latency: 1250,
        status: "success" as const,
      },
      {
        userId: user1.id,
        apiKeyId: apiKey1.id,
        model: "claude-3-opus",
        provider: "anthropic",
        inputTokens: 2000,
        outputTokens: 1500,
        cost: 87500,
        latency: 3200,
        status: "success" as const,
      },
      {
        userId: user1.id,
        apiKeyId: apiKey2.id,
        model: "gpt-3.5-turbo",
        provider: "openai",
        inputTokens: 50,
        outputTokens: 120,
        cost: 1500,
        latency: 450,
        status: "success" as const,
      },
      {
        userId: user2.id,
        apiKeyId: apiKey3.id,
        model: "gpt-4",
        provider: "openai",
        inputTokens: 500,
        outputTokens: 800,
        cost: 28500,
        latency: 2100,
        status: "success" as const,
      },
      {
        userId: user2.id,
        apiKeyId: apiKey3.id,
        model: "claude-3-sonnet",
        provider: "anthropic",
        inputTokens: 100,
        outputTokens: 0,
        cost: 0,
        latency: 0,
        status: "error" as const,
        errorMessage: "Rate limit exceeded",
      },
    ];

    const createdLogs = await db.insert(apiLogs).values(logs).returning();
    console.log("✓ Created " + createdLogs.length + " API logs\n");

    await db.insert(creditTransactions).values([
      {
        userId: admin.id,
        amount: 1000000,
        type: "purchase",
        description: "Initial credit purchase",
      },
      {
        userId: user1.id,
        amount: 500000,
        type: "purchase",
        description: "Credit purchase via Stripe",
      },
      {
        userId: user1.id,
        amount: 250000,
        type: "purchase",
        description: "Credit purchase via Stripe",
      },
      {
        userId: user1.id,
        amount: -121500,
        type: "usage",
        description: "API usage deduction",
        relatedLogId: createdLogs[0].id,
      },
      {
        userId: user2.id,
        amount: 500000,
        type: "purchase",
        description: "Credit purchase via Stripe",
      },
      {
        userId: user2.id,
        amount: -250000,
        type: "usage",
        description: "API usage deduction",
        relatedLogId: createdLogs[3].id,
      },
      {
        userId: user2.id,
        amount: 50000,
        type: "bonus",
        description: "Welcome bonus credits",
      },
    ]);
    console.log("✓ Created 7 credit transactions\n");

    console.log("✅ Database seeded successfully!");
    console.log("\n📊 Summary:");
    console.log(
      "   • Users: 3 (admin@example.com, john@example.com, jane@example.com)",
    );
    console.log("   • API Keys: 3");
    console.log("   • API Logs: " + createdLogs.length);
    console.log("   • Credit Transactions: 7");
    console.log("\n🔑 Default passwords:");
    console.log("   • Admin: admin123");
    console.log("   • Users: user123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
