import { qrcode } from './qrcode'

const isLoaded = (): boolean => {
	const readyState = document.readyState
	return readyState === 'complete' || readyState === 'interactive'
}

const whenLoaded = (cb: () => void): void => {
	if (isLoaded()) return cb()
	window.onload = cb
}

const debounce = (cb: () => void, timeout = 0): (() => void) => {
	let t = 0
	let lock = false
	return (): void => {
		if (lock) {
			clearTimeout(t)
		}
		lock = true
		t = window.setTimeout(() => {
			lock = false
			cb()
		}, timeout)
	}
}

whenLoaded(() => {
	const img = document.getElementById('img') as HTMLImageElement
	const input = document.getElementById('input') as HTMLInputElement

	const update = debounce((): void => {
		img.src = qrcode(input.value || '')
	}, 150)

	const hashUpdate = (): void => {
		input.value = window.location.hash.substring(1)
		update()
		window.requestAnimationFrame(() => {
			input.focus()
			window.requestAnimationFrame(() => {
				input.select()
			})
		})
	}

	window.addEventListener('hashchange', hashUpdate)
	hashUpdate()

	input.addEventListener('keydown', update)
	input.addEventListener('keyup', update)
	input.addEventListener('change', update)
	input.addEventListener('blur', update)
	input.addEventListener('compositionend', update)
})
