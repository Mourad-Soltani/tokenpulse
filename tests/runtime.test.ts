import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gatewayStatus } from "../src/runtime.ts";

describe("gateway runtime status", () => {
  it("defaults to loopback 8788 without exposing a token", () => {
    const prev = {
      host: process.env.TOKENPULSE_GATEWAY_HOST,
      port: process.env.TOKENPULSE_GATEWAY_PORT,
      mock: process.env.TOKENPULSE_MOCK_UPSTREAM,
      token: process.env.TOKENPULSE_GATEWAY_TOKEN,
    };
    delete process.env.TOKENPULSE_GATEWAY_HOST;
    delete process.env.TOKENPULSE_GATEWAY_PORT;
    delete process.env.TOKENPULSE_MOCK_UPSTREAM;
    delete process.env.TOKENPULSE_GATEWAY_TOKEN;
    try {
      const s = gatewayStatus();
      assert.equal(s.host, "127.0.0.1");
      assert.equal(s.port, 8788);
      assert.equal(s.loopback, true);
      assert.equal(s.mockUpstream, false);
      assert.equal(s.authRequired, false);
      assert.equal(JSON.stringify(s).includes("TOKEN"), false);
    } finally {
      if (prev.host !== undefined) process.env.TOKENPULSE_GATEWAY_HOST = prev.host;
      if (prev.port !== undefined) process.env.TOKENPULSE_GATEWAY_PORT = prev.port;
      if (prev.mock !== undefined) process.env.TOKENPULSE_MOCK_UPSTREAM = prev.mock;
      if (prev.token !== undefined) process.env.TOKENPULSE_GATEWAY_TOKEN = prev.token;
    }
  });

  it("reads host/port/mock/auth from env", () => {
    process.env.TOKENPULSE_GATEWAY_HOST = "0.0.0.0";
    process.env.TOKENPULSE_GATEWAY_PORT = "9001";
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "dev-local-token";
    const s = gatewayStatus();
    assert.equal(s.host, "0.0.0.0");
    assert.equal(s.port, 9001);
    assert.equal(s.loopback, false);
    assert.equal(s.mockUpstream, true);
    assert.equal(s.authRequired, true);
    assert.ok(!JSON.stringify(s).includes("dev-local-token"));
  });
});
