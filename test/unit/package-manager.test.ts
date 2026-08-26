import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execCommand } from '#src/package-manager'

// The same mapping Playwright uses for its own hints, so a run does not tell
// you to use two different package managers in two different lines.
const cases: [string | undefined, string][] = [
  [undefined, 'npx'],
  ['npm/10.8.2 node/v22.18.0 darwin arm64 workspaces/false', 'npx'],
  ['pnpm/9.12.0 npm/? node/v22.18.0 darwin arm64', 'pnpm exec'],
  ['yarn/4.5.0 npm/? node/v22.18.0 darwin arm64', 'yarn'],
  ['', 'npx'],
]

for (const [agent, expected] of cases) {
  test(`${agent === undefined ? 'no user agent' : (agent.split('/')[0] || 'empty')} runs through ${expected}`, (t) => {
    const before = process.env.npm_config_user_agent

    t.after(() => {
      if (before === undefined) delete process.env.npm_config_user_agent
      else process.env.npm_config_user_agent = before
    })

    if (agent === undefined) delete process.env.npm_config_user_agent
    else process.env.npm_config_user_agent = agent

    assert.equal(execCommand(), expected)
  })
}
