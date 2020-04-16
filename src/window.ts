import { WINDOW } from './window-itself'
export * from './window-itself'

const doc = WINDOW.document

const getTag = doc.getElementsByTagName.bind(doc)

export const element = <K extends keyof HTMLElementTagNameMap>(
	name: K,
): HTMLElementTagNameMap[K] => getTag(name)[0]

// prettier-ignore
export const {
	Object, Array, String, Number, URL, Function,
	Blob, TextEncoder,
	HTMLElement, HTMLInputElement, HTMLImageElement,
	setTimeout, clearTimeout, requestAnimationFrame,
	Uint8Array, Uint16Array, Uint32Array,
} = WINDOW

export const { ceil, abs } = WINDOW.Math

const freeze = Object.freeze

// prettier-ignore
const objs = [
	Object, Array, String, Number, URL, Function,
	Blob, TextEncoder,
	HTMLElement, HTMLInputElement, HTMLImageElement,
	Uint8Array, Uint16Array, Uint32Array,
]

objs.map(t => {
	try {
		if (t.prototype) freeze(t.prototype)
		freeze(t)
	} catch {
		// no thanks
	}
})
