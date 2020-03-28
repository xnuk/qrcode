/* eslint-disable @typescript-eslint/camelcase */
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import type { RollupOptions, Plugin } from 'rollup'

const production = process.env.NODE_ENV === 'production'

const plugin = (plugins: (Plugin | false | undefined | null)[]): Plugin[] =>
	plugins.filter((v): v is Exclude<typeof v, false | null | undefined> => !!v)

const options: RollupOptions = {
	input: 'src/index.ts',
	plugins: [typescript({ tsconfig: './tsconfig.json' })],
	output: {
		file: 'dist/index.js',
		format: 'iife',
		plugins: plugin([
			production
				&& terser({
					ecma: 7,
					warnings: true,
					mangle: {
						properties: true,
						eval: true,
					},
					compress: {
						booleans_as_integers: true,
						drop_console: true,
						expression: true,
						hoist_funs: true,
						keep_fargs: false,
						passes: 3,
						unsafe: true,
						unsafe_arrows: true,
						unsafe_comps: true,
						unsafe_Function: true,
						unsafe_math: true,
						unsafe_methods: true,
						unsafe_proto: true,
						unsafe_regexp: true,
						unsafe_undefined: true,
						warnings: true,
					},
					module: true,
					toplevel: true,
				}),
		]),
	},
}

export default options
