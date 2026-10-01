import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gatewayStatus } from "../src/runtime.ts";

function stash() {
  return {
    host: process.env.TOKENPULSE_GATEWAY_HOST,
    port: process.env.TOKENPULSE_GATEWAY_PORT,
    platform: process.env.PORT,
    mock: process.env.TOKENPULSE_MOCK_UPSTREAM,
    token: process.env.TOKENPULSE_GATEWAY_TOKEN,
  };
}

function restore(prev: ReturnType<typeof stash>) {
  for (const [k, env] of [
    ["TOKENPULSE_GATEWAY_HOST", prev.host],
    ["TOKENPULSE_GATEWAY_PORT", prev.port],
    ["PORT", prev.platform],
    ["TOKENPULSE_MOCK_UPSTREAM", prev.mock],
    ["TOKENPULSE_GATEWAY_TOKEN", prev.token],
  ] as const) {
    if (env === undefined) delete process.env[k];
    else process.env[k] = env;
  }
}

describe("gateway runtime status", () => {
  it("defaults to loopback 8788 without exposing a token", () => {
    const prev = stash();
    delete process.env.TOKENPULSE_GATEWAY_HOST;
    delete process.env.TOKENPULSE_GATEWAY_PORT;
    delete process.env.PORT;
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
      restore(prev);
    }
  });

  it("reads host/port/mock/auth from env", () => {
    const prev = stash();
    process.env.TOKENPULSE_GATEWAY_HOST = "0.0.0.0";
    process.env.TOKENPULSE_GATEWAY_PORT = "9001";
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "dev-local-token";
    try {
      const s = gatewayStatus();
      assert.equal(s.host, "0.0.0.0");
      assert.equal(s.port, 9001);
      assert.equal(s.loopback, false);
      assert.equal(s.mockUpstream, true);
      assert.equal(s.authRequired, true);
      assert.ok(!JSON.stringify(s).includes("dev-local-token"));
    } finally {
      restore(prev);
    }
  });

  it("uses platform PORT and binds 0.0.0.0 when TOKENPULSE_GATEWAY_* unset", () => {
    const prev = stash();
    delete process.env.TOKENPULSE_GATEWAY_HOST;
    delete process.env.TOKENPULSE_GATEWAY_PORT;
    process.env.PORT = "8080";
    try {
      const s = gatewayStatus();
      assert.equal(s.port, 8080);
      assert.equal(s.host, "0.0.0.0");
      assert.equal(s.loopback, false);
    } finally {
      restore(prev);
    }
  });
});
