if ((process.env.npm_config_user_agent || 'pnpm').split('/', 1)[0] !== 'pnpm') {
	throw new Error(
		`

		======================================================================

		${'  '}This project uses \`pnpm\` for package manager. https://pnpm.js.org

		${'    '}$  npx pnpm add -g pnpm

		======================================================================

		`.replace(/\n\t*/g, '\n'),
	)
}
