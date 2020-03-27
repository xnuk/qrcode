import { generateFromText, ECCLEVEL } from './qr'
import { render } from './qr-bmp'

let latest: { key: string, url: string, } | null = null

// eslint-disable-next-line spaced-comment
const Blob = /*@__INLINE__*/ window.Blob

// eslint-disable-next-line spaced-comment
const blobURL = /*@__INLINE__*/ (key: string, blob: Blob): string => {
	if (latest) {
		if (latest.key === key) return latest.url

		URL.revokeObjectURL(latest.url)
	}

	const url = URL.createObjectURL(blob)
	latest = { key, url }
	return url
}

// eslint-disable-next-line spaced-comment
export const qrcode = /*@__INLINE__*/ (
	text: string,
	ecclevel?: ECCLEVEL,
): string =>
	blobURL(
		text,
		new Blob(render(generateFromText(text, ecclevel)), {
			type: 'image/bmp',
		}),
	)
