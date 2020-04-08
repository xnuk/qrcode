#!/usr/bin/env node
import { promises as fs } from 'fs'

const production = process.env.NODE_ENV === 'production'

const main = async (): Promise<void> => {
	const file = {
		js: undefined as string | undefined,
		css: undefined as string | undefined,
		html: undefined as string | undefined,
	}

	const exts = Object.keys(file) as (keyof typeof file)[]

	await Promise.all(
		process.argv.slice(2).map(async path => {
			const ext = exts.find(v => path.endsWith(v))
			if (!ext) return

			try {
				file[ext] = ((await fs.readFile(path, 'utf8')).trim())
			} catch {
				console.error(`ERR: ${path} is not a valid file`)
				process.exit(1)
			}
		}),
	)

	if (file.html == null) {
		console.error('ERR: no html file')
		return process.exit(1)
	}

	const result = file.html
		.trim()
		.replace(production ? /\s*\n\s*/g : /^$/, '')
		.replace(
			/(<style\s?[^>]*>)(<\/style>)/,
			(_, open, close) => file.css ? open + file.css + close : '',
		)
		.replace(
			/(<script\s?[^>]*>)(<\/script>)/,
			(_, open, close) =>
				file.js
					? open
						+ file.js.replace(
							/;($|(?:const|for|return|var|let|break|case|else|if|throw|switch)\b)/g,
							'\n$1',
						).trim()
						+ close
					: '',
		)

	process.stdout.write(result)
}

main()
