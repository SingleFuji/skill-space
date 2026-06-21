import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const CHARACTER_LIMIT = 50000;

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH;
  if (!dbPath) {
    throw new Error("SQLITE_DB_PATH environment variable is required");
  }
  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`);
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Database file does not exist: ${resolvedPath}`);
  }
  const db = new Database(resolvedPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  return db;
}

function getReadonlyDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH;
  if (!dbPath) {
    throw new Error("SQLITE_DB_PATH environment variable is required");
  }
  const resolvedPath = path.resolve(dbPath);
  const db = new Database(resolvedPath, { readonly: true });
  return db;
}

function truncateResult(text: string, resultCount: number): string {
  if (text.length > CHARACTER_LIMIT) {
    const truncatedMsg = `\n\n[Response truncated at ${CHARACTER_LIMIT} characters. ` +
      `Query returned ${resultCount} results. Use LIMIT/OFFSET or add WHERE filters to see more.]`;
    return text.slice(0, CHARACTER_LIMIT - truncatedMsg.length) + truncatedMsg;
  }
  return text;
}

async function runStdio() {
  if (!process.env.SQLITE_DB_PATH) {
    console.error("ERROR: SQLITE_DB_PATH environment variable is required");
    console.error("Usage: SQLITE_DB_PATH=/path/to/db.sqlite node dist/index.js");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`sqlite-mcp-server running via stdio (db: ${process.env.SQLITE_DB_PATH})`);
}

const server = new McpServer({
  name: "sqlite-mcp-server",
  version: "1.0.0",
});

// ── sqlite_query ────────────────────────────────────────────────────
const QuerySchema = z.object({
  sql: z.string()
    .min(1, "SQL query is required")
    .describe("SELECT SQL query to execute"),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .default([])
    .describe("Optional positional parameters for parameterized queries"),
}).strict();

server.registerTool(
  "sqlite_query",
  {
    title: "Execute SQL Query",
    description: `Execute a SELECT SQL query against the SQLite database and return results as an array of objects.

This tool is READ-ONLY and will reject any non-SELECT statements.

Args:
  - sql (string): SELECT SQL statement to execute
  - params (array): Optional positional parameters for parameterized queries (default: [])

Returns:
  Array of row objects where each key is a column name.

Examples:
  - Use when: "Show all users" -> params with sql="SELECT * FROM users"
  - Use when: "Find user by email" -> params with sql="SELECT * FROM users WHERE email = ?", params=["user@example.com"]
  - Use when: "Count records" -> params with sql="SELECT COUNT(*) as count FROM orders"

Error Handling:
  - Returns error if SQL is not a SELECT statement
  - Returns error if database file doesn't exist or is inaccessible`,
    inputSchema: QuerySchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: z.infer<typeof QuerySchema>) => {
    const trimmed = params.sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("PRAGMA") && !trimmed.startsWith("WITH")) {
      return {
        content: [{ type: "text", text: "Error: Only SELECT, PRAGMA, and WITH statements are allowed in sqlite_query. Use sqlite_execute for data modifications." }],
      };
    }

    try {
      const db = getReadonlyDb();
      try {
        const stmt = db.prepare(params.sql);
        const rows = stmt.all(...params.params) as Record<string, unknown>[];
        const text = JSON.stringify(rows, null, 2);
        return {
          content: [{ type: "text", text: truncateResult(text, rows.length) }],
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
);

// ── sqlite_execute ──────────────────────────────────────────────────
const ExecuteSchema = z.object({
  sql: z.string()
    .min(1, "SQL statement is required")
    .describe("INSERT, UPDATE, or DELETE SQL statement to execute"),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .default([])
    .describe("Optional positional parameters for parameterized queries"),
}).strict();

server.registerTool(
  "sqlite_execute",
  {
    title: "Execute Data Modification SQL",
    description: `Execute INSERT, UPDATE, DELETE, or DDL statements against the SQLite database.

This tool MODIFIES DATA. Only non-SELECT statements allowed.

Args:
  - sql (string): INSERT/UPDATE/DELETE/CREATE/ALTER/DROP SQL statement to execute
  - params (array): Optional positional parameters for parameterized queries (default: [])

Returns:
  Object with 'changes' (number of rows affected) and optionally 'lastInsertRowid'.

Examples:
  - Use when: "Insert a new user" -> params with sql="INSERT INTO users (name, email) VALUES (?, ?)", params=["Alice", "alice@example.com"]
  - Use when: "Update user email" -> params with sql="UPDATE users SET email = ? WHERE id = ?", params=["new@example.com", 1]
  - Use when: "Delete old records" -> params with sql="DELETE FROM logs WHERE created_at < date('now', '-30 days')"
  - Use when: "Create a table" -> params with sql="CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)"

Error Handling:
  - Returns error if SQL contains SELECT
  - Returns error if database operations fail`,
    inputSchema: ExecuteSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (params: z.infer<typeof ExecuteSchema>) => {
    const trimmed = params.sql.trim().toUpperCase();
    if (trimmed.startsWith("SELECT") || trimmed.startsWith("PRAGMA") || trimmed.startsWith("WITH")) {
      return {
        content: [{ type: "text", text: "Error: SELECT/PRAGMA/WITH statements are not allowed in sqlite_execute. Use sqlite_query for read operations." }],
      };
    }

    try {
      const db = getDb();
      try {
        const stmt = db.prepare(params.sql);
        const result = stmt.run(...params.params);
        const output = {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
);

// ── sqlite_list_tables ──────────────────────────────────────────────
server.registerTool(
  "sqlite_list_tables",
  {
    title: "List Database Tables",
    description: `List all tables in the SQLite database, including virtual tables.

Returns:
  Array of objects with 'name' (table name) and 'type' (table type, e.g., 'table', 'view').

Examples:
  - Use when: "What tables are in the database?"
  - Use before: sqlite_describe_table to understand table structure`,
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async () => {
    try {
      const db = getReadonlyDb();
      try {
        const rows = db.prepare(
          "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name"
        ).all() as { name: string; type: string }[];
        if (rows.length === 0) {
          return {
            content: [{ type: "text", text: "No tables found in the database." }],
          };
        }
        const text = JSON.stringify(rows, null, 2);
        return {
          content: [{ type: "text", text }],
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
);

// ── sqlite_describe_table ───────────────────────────────────────────
const DescribeSchema = z.object({
  table: z.string()
    .min(1, "Table name is required")
    .describe("Name of the table to describe"),
}).strict();

server.registerTool(
  "sqlite_describe_table",
  {
    title: "Describe Table Structure",
    description: `Show the column schema, types, and constraints for a specific table or view.

Uses PRAGMA table_info to retrieve column details.

Args:
  - table (string): Name of the table or view to describe

Returns:
  Array of column definitions with: cid (column index), name, type, notnull, dflt_value (default), pk (primary key position, 0 if not PK).

Examples:
  - Use when: "Show me the structure of the users table"
  - Use when: "What columns does the orders table have?"

Error Handling:
  - Returns error if the table does not exist`,
    inputSchema: DescribeSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: z.infer<typeof DescribeSchema>) => {
    try {
      const db = getReadonlyDb();
      try {
        const rows = db.prepare(`PRAGMA table_info(${params.table})`).all() as {
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }[];
        if (rows.length === 0) {
          return {
            content: [{ type: "text", text: `Table '${params.table}' does not exist or has no columns.` }],
          };
        }
        const text = JSON.stringify(rows, null, 2);
        return {
          content: [{ type: "text", text }],
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
);

runStdio().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
