/* global requestAnimationFrame */
import { qrcode } from './qrcode'

const element = <K extends keyof HTMLElementTagNameMap>(
	name: K,
): HTMLElementTagNameMap[K] => document.getElementsByTagName(name)[0]

const img = element('img')
const input = element('input')

const update = (): unknown => requestAnimationFrame(() => {
	img.src = qrcode(input.value || '')
})

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
	requestAnimationFrame(() => {
		input.focus()
		requestAnimationFrame(() => input.select())
	})
}

window.addEventListener('hashchange', hashchange)

requestAnimationFrame(hashchange)
