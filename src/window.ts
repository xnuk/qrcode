import { WINDOW } from './window-itself'
export * from './window-itself'

const doc = WINDOW.document

const getTag = doc.getElementsByTagName.bind(doc)

export const element = <K extends keyof HTMLElementTagNameMap>(
	name: K,
): HTMLElementTagNameMap[K] => getTag(name)[0]

// prettier-ignore
export const {
	HTMLElement, HTMLInputElement, HTMLImageElement,
	requestAnimationFrame,
} = WINDOW
