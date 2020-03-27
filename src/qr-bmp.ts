const startBufferLength = 0x20

// prettier-ignore
const startBuffer = new Uint8Array([
	0x42, 0x4d, // magic ('BM')

	0, 0, 0, 0, // length -- @2

	0, 0, 0, 0, // should be [0u16, 0u16].

	startBufferLength, 0x00, 0x00, 0x00, // offset

	// dib --------------------
	0x0c, 0x00, 0x00, 0x00, // dib length

	0, 0, // width -- @18
	0, 0, // height -- @20

	1, 0, // should be 1u16

	1, 0, // color bits

	// palette -------------------
	-1, -1, -1, // white - 0
	0, 0, 0, // black - 1
])

const writeUInt32LE = (
	array: Uint8Array,
	value: number,
	offset: number,
): typeof array => {
	array.set([value >> 0, value >> 8, value >> 16, value >> 24], offset)
	return array
}

const writeUInt16LE = (
	array: Uint8Array,
	value: number,
	offset: number,
): typeof array => {
	array.set([value >> 0, value >> 8], offset)
	return array
}

type Bit = 0 | 1

// eslint-disable-next-line spaced-comment
const bitsToBytes = /*@__PURE__*/ (bits: Bit[]): Uint8Array => {
	const len = bits.length
	const buf = new Uint8Array(Math.ceil(len / 32) * 4)

	for (let i = 0; i * 8 < len; ++i) {
		// bits to octets
		const data = bits
			.slice(i * 8, (i + 1) * 8)
			.reduce((st, v, i) => st | (v << (8 - 1 - i)), 0 as number)

		buf[i] = data
	}

	return buf
}

export const render = (data: Bit[][]): Uint8Array[] => {
	const width = data[0].length
	const height = data.length

	// data with given color bits (1 bit),
	// and add some paddings to make the row length into multiple of 4 bytes
	// ceil(bytes / 4) * 4 where bytes = width * color_bits / 8
	const bitmapRowLength = Math.ceil(width / 32) * 4
	const bitmapLength = bitmapRowLength * height

	const newBuffer = startBuffer.slice()

	writeUInt32LE(newBuffer, bitmapLength + startBufferLength, 2)
	writeUInt16LE(newBuffer, width, 18)
	writeUInt16LE(newBuffer, height, 20)

	// https://stackoverflow.com/questions/8346115/why-are-bmps-stored-upside-down
	const dataBytes = data.map(bitsToBytes).reverse()

	dataBytes.unshift(newBuffer)

	return dataBytes
}
