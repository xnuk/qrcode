#!/usr/bin/env node
import { promises as fs } from 'fs'

const production = process.env.NODE_ENV === 'production'

const main = async (): Promise<void> => {
	const files = {
		js: [] as string[],
		css: [] as string[],
		html: [] as string[],
	}

	const exts = Object.keys(files) as (keyof typeof files)[]

	await Promise.all(
		process.argv.slice(2).map(async path => {
			const ext = exts.find(v => path.endsWith(v))
			if (!ext) return

			try {
				files[ext].push((await fs.readFile(path, 'utf8')).trim())
			} catch {
				console.error(`ERR: ${path} is not a valid file`)
			}
		}),
	)

	const result = files.html
		.join('\n')
		.trim()
		.replace(production ? /\s*\n\s*/g : /^$/, '')
		.replace(
			/(<style\s?[^>]*>)(<\/style>)/,
			(_, open, close) => open + files.css.join('') + close,
		)
		.replace(
			/(<script\s?[^>]*>)(<\/script>)/,
			(_, open, close) =>
				open + files.js.join(';').replace(/;$/, '') + close,
		)

	process.stdout.write(result)
}

main()
