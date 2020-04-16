import { URL } from './window'
import { generateFromText, ECCLEVEL } from './qr'
import { render } from './qr-bmp'

let latest: { key: string, url: string, } | null = null

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
	// eslint-disable-next-line spaced-comment
	/*@__INLINE__*/ blobURL(
		text,
		render(
			// eslint-disable-next-line spaced-comment
			/*@__INLINE__*/ generateFromText(text, ecclevel),
		),
	)
