const PLUGIN_ID = "openai-codex-auth";
const PROVIDER_ID = "openai-codex";
const PROVIDER_LABEL = "OpenAI Codex";
const DEFAULT_MODEL_ID = "gpt-5.4";
const DEFAULT_MODEL_REF = `${PROVIDER_ID}/${DEFAULT_MODEL_ID}`;
const DEFAULT_BASE_URL = "https://chatgpt.com/backend-api";
const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const REDIRECT_URI = "http://localhost:1455/auth/callback";
const SCOPE = "openid profile email offline_access";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const CALLBACK_PORT = 1455;
const CALLBACK_HOST = "127.0.0.1";
const SUCCESS_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication successful</title>
</head>
<body>
  <p>Authentication successful. Return to your terminal to continue.</p>
</body>
</html>`;
const MODEL_DEFINITIONS = [
  buildModel("gpt-5.4"),
  buildModel("gpt-5.3-codex"),
  buildModel("gpt-5.2-codex"),
  buildModel("gpt-5.1-codex")
];

function buildModel(id) {
  return {
    id,
    name: id,
    api: "openai-codex-responses",
    reasoning: true,
    input: ["text", "image"],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0
    },
    contextWindow: 200000,
    maxTokens: 32000
  };
}

function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generatePkce() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64urlEncode(verifierBytes);
  const data = new TextEncoder().encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64urlEncode(new Uint8Array(hashBuffer));
  return { verifier, challenge };
}

function createState() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
}

function parseAuthorizationInput(input) {
  const value = String(input ?? "").trim();
  if (!value) {
    return {};
  }

  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get("code") ?? undefined,
      state: url.searchParams.get("state") ?? undefined
    };
  } catch {
    // Not a URL; continue with looser parsing.
  }

  if (value.includes("#")) {
    const [code, state] = value.split("#", 2);
    return { code, state };
  }

  if (value.includes("code=")) {
    const params = new URLSearchParams(value);
    return {
      code: params.get("code") ?? undefined,
      state: params.get("state") ?? undefined
    };
  }

  return { code: value };
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function extractAccountId(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const authClaims = payload?.[JWT_CLAIM_PATH];
  const accountId = authClaims?.chatgpt_account_id;
  return typeof accountId === "string" && accountId.length > 0 ? accountId : null;
}

async function exchangeAuthorizationCode(code, verifier) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI token exchange failed (${response.status}): ${body || "empty response"}`);
  }

  const json = await response.json();
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new Error("OpenAI token exchange returned incomplete credentials");
  }

  const accountId = extractAccountId(json.access_token);
  if (!accountId) {
    throw new Error("Failed to extract ChatGPT account id from OpenAI access token");
  }

  return {
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + json.expires_in * 1000,
    accountId
  };
}

async function refreshOpenAICodexCredential(credential) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refresh,
      client_id: CLIENT_ID
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI token refresh failed (${response.status}): ${body || "empty response"}`);
  }

  const json = await response.json();
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new Error("OpenAI token refresh returned incomplete credentials");
  }

  const accountId = extractAccountId(json.access_token);
  if (!accountId) {
    throw new Error("Failed to extract ChatGPT account id from refreshed OpenAI access token");
  }

  return {
    ...credential,
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + json.expires_in * 1000,
    accountId
  };
}

async function createAuthorizationFlow() {
  const { verifier, challenge } = await generatePkce();
  const state = createState();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", "openclaw");
  return { verifier, state, url: url.toString() };
}

async function startLocalCallbackServer(expectedState) {
  const { createServer } = await import("node:http");

  let authorizationCode = null;
  let cancelled = false;

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url || "", `http://${CALLBACK_HOST}:${CALLBACK_PORT}`);
      if (url.pathname !== "/auth/callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      if (url.searchParams.get("state") !== expectedState) {
        res.statusCode = 400;
        res.end("State mismatch");
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        res.statusCode = 400;
        res.end("Missing authorization code");
        return;
      }

      authorizationCode = code;
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(SUCCESS_HTML);
    } catch {
      res.statusCode = 500;
      res.end("Internal error");
    }
  });

  const started = await new Promise((resolve) => {
    server.listen(CALLBACK_PORT, CALLBACK_HOST, () => resolve(true));
    server.on("error", () => resolve(false));
  });

  if (!started) {
    try {
      server.close();
    } catch {
      // Ignore close failures on partial start.
    }

    return {
      async close() {},
      cancel() {
        cancelled = true;
      },
      async waitForCode(timeoutMs = 120000) {
        return null;
      }
    };
  }

  return {
    async close() {
      try {
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(() => resolve()));
      } catch {
        // Ignore close failures when the server is already down.
      }
    },
    cancel() {
      cancelled = true;
    },
    async waitForCode(timeoutMs = 120000) {
      const intervalMs = 100;
      const maxIterations = Math.ceil(timeoutMs / intervalMs);
      for (let i = 0; i < maxIterations; i += 1) {
        if (authorizationCode) {
          return authorizationCode;
        }
        if (cancelled) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return null;
    }
  };
}

async function loginOpenAICodex(ctx) {
  const { verifier, state, url } = await createAuthorizationFlow();
  const callbackServer = await startLocalCallbackServer(state);

  await ctx.prompter.note(
    [
      "Browser will open for OpenAI Codex authentication.",
      `If the callback does not complete automatically, paste the full redirect URL or code.`,
      `Callback URI: ${REDIRECT_URI}`
    ].join("\n"),
    "OpenAI Codex OAuth"
  );

  const progress = ctx.prompter.progress("Waiting for OpenAI sign-in");

  try {
    await ctx.openUrl(url);

    let code = await callbackServer.waitForCode();
    if (!code) {
      progress.update("Waiting for pasted redirect URL or code");
      const manual = await ctx.prompter.text({
        message: "Paste the OpenAI redirect URL or authorization code"
      });
      const parsed = parseAuthorizationInput(manual);
      if (parsed.state && parsed.state !== state) {
        throw new Error("OpenAI OAuth state mismatch");
      }
      code = parsed.code;
    }

    if (!code) {
      throw new Error("Missing OpenAI authorization code");
    }

    progress.update("Exchanging OpenAI authorization code");
    const oauth = await exchangeAuthorizationCode(code, verifier);
    progress.stop("OpenAI Codex OAuth complete");

    return {
      profiles: [
        {
          profileId: `${PROVIDER_ID}:default`,
          credential: {
            type: "oauth",
            provider: PROVIDER_ID,
            access: oauth.access,
            refresh: oauth.refresh,
            expires: oauth.expires,
            accountId: oauth.accountId
          }
        }
      ],
      configPatch: {
        models: {
          providers: {
            [PROVIDER_ID]: {
              baseUrl: DEFAULT_BASE_URL,
              auth: "oauth",
              api: "openai-codex-responses",
              models: MODEL_DEFINITIONS
            }
          }
        },
        agents: {
          defaults: {
            models: Object.fromEntries(
              MODEL_DEFINITIONS.map((model) => [`${PROVIDER_ID}/${model.id}`, {}])
            )
          }
        }
      },
      defaultModel: DEFAULT_MODEL_REF,
      notes: [
        "OpenAI Codex uses ChatGPT OAuth, not an OpenAI API key.",
        "If login fails in a remote shell, run the command locally and paste the redirect URL when prompted."
      ]
    };
  } catch (error) {
    progress.stop("OpenAI Codex OAuth failed");
    throw error;
  } finally {
    callbackServer.cancel();
    await callbackServer.close();
  }
}

const plugin = {
  id: PLUGIN_ID,
  name: "OpenAI Codex OAuth",
  description: "Adds the openai-codex provider to OpenClaw via ChatGPT OAuth.",
  configSchema: {
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  register(api) {
    api.registerProvider({
      id: PROVIDER_ID,
      label: PROVIDER_LABEL,
      docsPath: "/providers/openai",
      auth: [
        {
          id: "oauth",
          label: "ChatGPT OAuth",
          hint: "Sign in with the ChatGPT account that has Codex access",
          kind: "oauth",
          run: loginOpenAICodex
        }
      ],
      refreshOAuth: refreshOpenAICodexCredential
    });
  }
};

export default plugin;
