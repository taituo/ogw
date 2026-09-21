# ogw

OpenAI-compatible gateway in front of one or more OpenCode Go accounts. The process listens on `127.0.0.1:8787` unless `GATEWAY_HOST` and `PORT` say otherwise. It does not filter the model list unless `OPENCODE_GO_MODELS` is set.

Accounts come from the environment. None of these paths are built into the program:

```bash
# {"accounts":[{"name":"go-a","env":"OPENCODE_GO_KEY_A","key":"..."}]}
OPENCODE_ACCOUNTS_FILE=/path/to/accounts.json npm start

# or one OpenCode auth file with an opencode-go key
OPENCODE_AUTH_FILE=/path/to/auth.json npm start

# or the keys are already in the environment
PI_OPENCODE_GO_STACK=go-a:OPENCODE_GO_KEY_A,go-b:OPENCODE_GO_KEY_B npm start
```

`PI_OPENCODE_GO_STACK` names environment variables. It does not contain the keys.

Node >= 22. `npm start` runs the TypeScript with `tsx`. `npm run build` writes `dist/` with `tsc`.
