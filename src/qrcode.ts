import { generateFromText, ECCLEVEL } from './qr'
import { render } from './qr-bmp'

const base64 = (data: Uint8Array): string =>
	window.btoa(String.fromCharCode.apply(null, (data as unknown) as number[]))

export const qrcode = (text: string, ecclevel?: ECCLEVEL): string =>
	'data:image/bmp;base64,' +
	base64(render(generateFromText(text, { ecclevel })))
// ;(window as any).QR = qrcode
