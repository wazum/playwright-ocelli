// Mirrors how Playwright picks the command for its own hints, so one run does
// not suggest two different package managers.
export function execCommand() {
  const agent = process.env.npm_config_user_agent ?? ''

  if (agent.includes('yarn')) return 'yarn'
  if (agent.includes('pnpm')) return 'pnpm exec'

  return 'npx'
}
