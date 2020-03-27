import { qrcode } from './qrcode'

;[Object, Array, String, Number].map(v => Object.freeze(v))

const element = <K extends keyof HTMLElementTagNameMap>(
	name: K,
): HTMLElementTagNameMap[K] => document.getElementsByTagName(name)[0]

const img = element('img')
const input = element('input')

const raf = window.requestAnimationFrame

const update = (): unknown => raf(() => (img.src = qrcode(input.value || '')))

;[
	'keydown',
	'keyup',
	'change',
	'blur',
	'paste',
	'compositionupdate',
	'compositionend',
].map(key => input.addEventListener(key, update, false))

const hashchange = (): void => {
	input.value = window.location.hash.substring(1)
	update()
	raf(() => {
		input.focus()
		raf(() => input.select())
	})
}

window.addEventListener('hashchange', hashchange)

raf(hashchange)
