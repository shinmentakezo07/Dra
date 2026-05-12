import { pgTable, text, timestamp, uuid, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API Keys table for OpenRouter-style dashboard
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  userIdIdx: index("api_keys_user_id_idx").on(table.userId),
}));

// API Request Logs table
export const apiLogs = pgTable("api_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cost: integer("cost").notNull(), // in credits (microcents)
  latency: integer("latency").notNull(), // in milliseconds
  status: text("status", { enum: ["success", "error"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("api_logs_user_id_idx").on(table.userId),
  apiKeyIdIdx: index("api_logs_api_key_id_idx").on(table.apiKeyId),
  createdAtIdx: index("api_logs_created_at_idx").on(table.createdAt),
}));

// User Credits table
export const userCredits = pgTable("user_credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  balance: integer("balance").default(0).notNull(), // in credits (microcents)
  totalPurchased: integer("total_purchased").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_credits_user_id_idx").on(table.userId),
}));

// Credit Transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(), // positive for purchase, negative for usage
  type: text("type", { enum: ["purchase", "usage", "refund", "bonus"] }).notNull(),
  description: text("description").notNull(),
  relatedLogId: uuid("related_log_id").references(() => apiLogs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("credit_transactions_user_id_idx").on(table.userId),
  createdAtIdx: index("credit_transactions_created_at_idx").on(table.createdAt),
}));

// Relations for new tables
export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  logs: many(apiLogs),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
  relatedLog: one(apiLogs, {
    fields: [creditTransactions.relatedLogId],
    references: [apiLogs.id],
  }),
}));
