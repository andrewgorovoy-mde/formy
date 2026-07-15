import { describe, it, expect, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { submitWithRetry } = require("../../agent/lib/submit");

const schema = {
  form: { fields: [{ id: "email" }, { id: "gpa" }] },
  submit: { url: "http://localhost/api/forms/f1/submissions", method: "POST", content_type: "application/json" },
};

describe("submitWithRetry", () => {
  it("submits once and returns ok on the first 201", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ submission_id: "sub_1", status: "received", form_id: "f1" }),
    });
    const answerFn = vi.fn().mockResolvedValue({ email: "a@b.com", gpa: 3.8 });

    const result = await submitWithRetry({ schema, profile: {}, answerFn, agentMeta: {}, fetchImpl });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(answerFn).toHaveBeenCalledTimes(1);
  });

  it("on 422, regenerates only the failing fields and retries once", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 422,
        json: async () => ({ error: "validation_failed", fields: { gpa: "must be a number between 0 and 4" } }),
      })
      .mockResolvedValueOnce({
        status: 201,
        json: async () => ({ submission_id: "sub_2", status: "received", form_id: "f1" }),
      });

    const answerFn = vi
      .fn()
      .mockResolvedValueOnce({ email: "a@b.com", gpa: 9.9 }) // initial: gpa out of range
      .mockResolvedValueOnce({ gpa: 3.8 }); // regenerate: only gpa, corrected

    const result = await submitWithRetry({ schema, profile: {}, answerFn, agentMeta: {}, fetchImpl });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.answers).toEqual({ email: "a@b.com", gpa: 3.8 });
    expect(answerFn).toHaveBeenNthCalledWith(1, schema, {});
    expect(answerFn).toHaveBeenNthCalledWith(2, schema, {}, ["gpa"]);
  });

  it("gives up after a single retry if still invalid", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 422,
      json: async () => ({ error: "validation_failed", fields: { gpa: "must be a number between 0 and 4" } }),
    });
    const answerFn = vi.fn().mockResolvedValue({ gpa: 99 });

    const result = await submitWithRetry({ schema, profile: {}, answerFn, agentMeta: {}, fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-422, non-201 responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 500,
      json: async () => ({ error: "server_error" }),
    });
    const answerFn = vi.fn().mockResolvedValue({});

    const result = await submitWithRetry({ schema, profile: {}, answerFn, agentMeta: {}, fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
