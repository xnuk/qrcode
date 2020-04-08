import typescript from '@rollup/plugin-typescript'
import type { RollupOptions } from 'rollup'

const windowObjects = `
	Object Array String Number URL Function
	Math Blob TextEncoder
	HTMLElement HTMLInputElement HTMLImageElement
	setTimeout clearTimeout requestAnimationFrame
	Uint8Array Uint16Array Uint32Array
`.trim().split(/\s+/).join(',')

const banner = `
((window) => {
	const { ${windowObjects} } = window
	const document = window.document
	const F = Object.freeze
	;[${windowObjects}].map(t => {
		try {
			if (t.prototype) F(t.prototype)
			F(t)
		} catch {}
	});
`
const footer = '})(window)'

const options: RollupOptions = {
	input: 'src/index.ts',
	plugins: [typescript()],
	output: {
		file: 'dist/index.js',
		format: 'es',
		banner,
		footer,
	},
}

export default options
