import { describe, expect, it, vi } from "vitest";
import { createSendByteMailer } from "../../server/sendbyte";

const message = {
  to: "ada@example.com",
  subject: "Reset your Weather password",
  text: "Open the link",
  html: "<p>Open the link</p>",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("TC-SRV-005 SendByte client", () => {
  it("posts the email to /v1/emails with the key and sender", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(201, { id: "em_1", status: "queued" }));
    const sendMail = createSendByteMailer({
      apiKey: "key-for-tests",
      from: "Weather <no-reply@example.com>",
      fetchFn,
    });

    await sendMail(message);

    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.sendbyte.africa/v1/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer key-for-tests");
    expect(JSON.parse(init.body)).toEqual({
      from: "Weather <no-reply@example.com>",
      to: "ada@example.com",
      subject: "Reset your Weather password",
      html: "<p>Open the link</p>",
      text: "Open the link",
    });
  });

  it("uses a different base address when one is given", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(201, { id: "em_1" }));
    const sendMail = createSendByteMailer({
      apiKey: "key-for-tests",
      from: "a@example.com",
      baseUrl: "http://localhost:9999",
      fetchFn,
    });

    await sendMail(message);

    expect(fetchFn.mock.calls[0][0]).toBe("http://localhost:9999/v1/emails");
  });

  it("throws with SendByte's message when the email is rejected, without the key", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(422, {
        error: { message: "The `to` field must be a valid email address." },
      })
    );
    const sendMail = createSendByteMailer({
      apiKey: "key-for-tests",
      from: "a@example.com",
      fetchFn,
    });

    const error = await sendMail(message).catch((caught: unknown) => caught as Error);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("422");
    expect((error as Error).message).toContain("must be a valid email address");
    expect((error as Error).message).not.toContain("key-for-tests");
  });

  it("still reports a failure when the error body is not JSON", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("Bad gateway", { status: 502, statusText: "Bad Gateway" }));
    const sendMail = createSendByteMailer({
      apiKey: "key-for-tests",
      from: "a@example.com",
      fetchFn,
    });

    await expect(sendMail(message)).rejects.toThrow("502");
  });
});
