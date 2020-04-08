#!/usr/bin/env node
import { promises as fs } from 'fs'
import { minify } from 'terser'
import { stderr as color } from 'chalk'

const production = process.env.NODE_ENV === 'production'

const windowObjects = `
	Object Array String Number URL Function
	Math Blob TextEncoder
	HTMLElement HTMLInputElement HTMLImageElement
	setTimeout clearTimeout requestAnimationFrame
	Uint8Array Uint16Array Uint32Array
`.trim().split(/\s+/).join(',')

const prefix = (input: string) => `
((window) => {
	const { ${windowObjects} } = window
	const document = window.document
	const F = Object.freeze
	;[${windowObjects}].map(t => {
		try {
			if (t.prototype) F(t.prototype)
			F(t)
		} catch {}
	})
	;${input}
})(window)
`

const terser = (input: string) => {
	input = prefix(input)

	if (!production) return input
	const { error, warnings, code } = minify(input, {
		ecma: 7,
		warnings: true,
		mangle: {
			properties: true,
			eval: true,
		},
		compress: {
			booleans_as_integers: true,
			drop_console: true,
			drop_debugger: true,
			expression: true,
			hoist_funs: true,
			keep_fargs: false,
			passes: 3,
			unsafe: true,
			unsafe_arrows: true,
			unsafe_comps: true,
			unsafe_Function: true,
			unsafe_symbols: true,
			unsafe_math: true,
			unsafe_methods: true,
			unsafe_proto: true,
			unsafe_regexp: true,
			unsafe_undefined: true,
			warnings: true,
		},
		module: true,
		toplevel: true,
	})

	if (error) {
		console.error(error)
		throw error
	}
	(warnings || []).forEach(s => console.warn(color.yellow(s)))
	return code || ''
}

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
						+ terser(file.js).replace(
							/;($|(?:const|for|return|var|let|break|case)\b)/g,
							'\n$1',
						).trim()
						+ close
					: '',
		)

	process.stdout.write(result)
}

main()
