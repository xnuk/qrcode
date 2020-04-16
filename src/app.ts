import { requestAnimationFrame, element, WINDOW } from './window'
import { qrcode } from './qrcode'

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
	input.value = WINDOW.location.hash.substring(1)
	update()
	requestAnimationFrame(() => {
		input.focus()
		requestAnimationFrame(() => input.select())
	})
}

WINDOW.addEventListener('hashchange', hashchange)

requestAnimationFrame(hashchange)
