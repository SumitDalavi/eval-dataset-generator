import request from "supertest";
import app from "../src/index";

jest.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

describe("Eval Dataset Generator API", () => {
  it("should return seeded demo logs", async () => {
    const res = await request(app).get("/api/logs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("logs");
    expect(res.body).toHaveProperty("total");
    expect(res.body.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
  
  it("should ingest a new log", async () => {
    const payload = {
      timestamp: new Date().toISOString(),
      prompt: "What is the capital of France?",
      response: "Paris",
      latencyMs: 150,
      userId: "user_test",
      metadata: { context: "test" }
    };
    const res = await request(app).post("/api/logs").send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});
