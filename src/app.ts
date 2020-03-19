import { qrcode } from './qrcode'

Object.freeze(Object.prototype)
Object.freeze(Array.prototype)

const debounce = (cb: () => void, timeout: number): (() => void) => {
	let t = 0
	let lock = false
	return (): void => {
		if (lock) {
			clearTimeout(t)
		}
		lock = true
		t = (setTimeout(() => {
			lock = false
			cb()
		}, timeout) as unknown) as number
	}
}

const event = (
	target: Window | HTMLElement | Document,
	types: string[],
	func: () => void,
): typeof func => {
	types.forEach(key => target.addEventListener(key, func, false))
	return func
}

const once = (func?: () => void) => (): void =>
	func && (func(), (func = undefined))

const next = (func: () => void, ...funcs: (() => void)[]): void => {
	window.requestAnimationFrame(() => {
		func()
		const first = funcs.shift()
		first && next(first, ...funcs)
	})
}

const element = <
	K extends keyof HTMLElementTagNameMap
>(name: K): HTMLElementTagNameMap[K] => document.getElementsByTagName(name)[0]

const call = event(
	document,
	['DOMContentLoaded'],
	once(() => {
		const img = element('img')
		const input = element('input')

		const update = event(
			input,
			['keydown', 'keyup', 'change', 'blur', 'compositionend'],
			debounce(() => (img.src = qrcode(input.value || '')), 150),
		)

		event(window, ['hashchange'], () => {
			input.value = window.location.hash.substring(1)
			update()
			next(
				() => input.focus(),
				() => input.select(),
			)
		})()
	}),
)

if (document.readyState !== 'loading') call()
