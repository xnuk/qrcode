import typescript from '@rollup/plugin-typescript'
import type { RollupOptions } from 'rollup'

const options: RollupOptions = {
	input: 'src/index.ts',
	plugins: [typescript()],
	output: {
		file: 'dist/index.js',
		format: 'iife',
	},
}

export default options
