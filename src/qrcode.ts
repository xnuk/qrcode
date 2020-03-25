import { generateFromText, ECCLEVEL } from './qr'
import { render } from './qr-bmp'

let latest: { key: string, url: string, } | null = null

const Blob = window.Blob

const blobURL = (key: string, blob: Blob): string => {
	if (latest) {
		if (latest.key === key) return latest.url

		URL.revokeObjectURL(latest.url)
	}

	const url = URL.createObjectURL(blob)
	latest = { key, url }
	return url
}

export const qrcode = (text: string, ecclevel?: ECCLEVEL): string =>
	blobURL(
		text,
		new Blob(render(generateFromText(text, { ecclevel })), {
			type: 'image/bmp',
		}),
	)
// ;(window as any).QR = qrcode
