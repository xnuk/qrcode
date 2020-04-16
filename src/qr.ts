import { abs, TextEncoder } from './window'
/* qr.js -- QR code generator in Javascript (revision 2011-01-19)
 * Written by Kang Seonghoon <public+qrjs@mearie.org>.
 *
 * This source code is in the public domain; if your jurisdiction does not
 * recognize the public domain the terms of Creative Commons CC0 license
 * apply. In the other words, you can always do what you want.
 */
/* Quick overview: QR code composed of 2D array of modules (a rectangular
 * area that conveys one bit of information); some modules are fixed to help
 * the recognition of the code, and remaining data modules are further divided
 * into 8-bit code words which are augumented by Reed-Solomon error correcting
 * codes (ECC). There could be multiple ECCs, in the case the code is so large
 * that it is helpful to split the raw data into several chunks.
 *
 * The number of modules is determined by the code's "version", ranging from 1
 * (21x21) to 40 (177x177). How many ECC bits are used is determined by the
 * ECC level (L/M/Q/H). The number and size (and thus the order of generator
 * polynomial) of ECCs depend to the version and ECC level.
 */

type Bit = 0 | 1

// per-version information (cf. JIS X 0510:2004 pp. 30--36, 71)
//
// [0]: the degree of generator polynomial by ECC levels
// [1]: # of code blocks by ECC levels
// [2]: left-top positions of alignment patterns
//
// the number in this table (in particular, [0]) does not exactly match with
// the numbers in the specficiation. see augumenteccs below for the reason.

const thirties = [28, 30, 30, 30] as const
const ones = [1, 1, 1, 1] as const

// prettier-ignore
const VERSIONS = [
	null as never,
	[[10, 7, 17, 13], ones, []],
	[[16, 10, 28, 22], ones, [4, 16]],
	[[26, 15, 22, 18], [1, 1, 2, 2], [4, 20]],
	[[18, 20, 16, 26], [2, 1, 4, 2], [4, 24]],
	[[24, 26, 22, 18], [2, 1, 4, 4], [4, 28]],
	[[16, 18, 28, 24], [4, 2, 4, 4], [4, 32]],
	[[18, 20, 26, 18], [4, 2, 5, 6], [4, 20, 36]],
	[[22, 24, 26, 22], [4, 2, 6, 6], [4, 22, 40]],
	[[22, 30, 24, 20], [5, 2, 8, 8], [4, 24, 44]],
	[[26, 18, 28, 24], [5, 4, 8, 8], [4, 26, 48]],
	[[30, 20, 24, 28], [5, 4, 11, 8], [4, 28, 52]],
	[[22, 24, 28, 26], [8, 4, 11, 10], [4, 30, 56]],
	[[22, 26, 22, 24], [9, 4, 16, 12], [4, 32, 60]],
	[[24, 30, 24, 20], [9, 4, 16, 16], [4, 24, 44, 64]],
	[[24, 22, 24, 30], [10, 6, 18, 12], [4, 24, 46, 68]],
	[[28, 24, 30, 24], [10, 6, 16, 17], [4, 24, 48, 72]],
	[[28, 28, 28, 28], [11, 6, 19, 16], [4, 28, 52, 76]],
	[[26, 30, 28, 28], [13, 6, 21, 18], [4, 28, 54, 80]],
	[[26, 28, 26, 26], [14, 7, 25, 21], [4, 28, 56, 84]],
	[[26, 28, 28, 30], [16, 8, 25, 20], [4, 32, 60, 88]],
	[[26, 28, 30, 28], [17, 8, 25, 23], [4, 26, 48, 70, 92]],
	[[28, 28, 24, 30], [17, 9, 34, 23], [4, 24, 48, 72, 96]],
	[thirties, [18, 9, 30, 25], [4, 28, 52, 76, 100]],
	[thirties, [20, 10, 32, 27], [4, 26, 52, 78, 104]],
	[[28, 26, 30, 30], [21, 12, 35, 29], [4, 30, 56, 82, 108]],
	[[28, 28, 30, 28], [23, 12, 37, 34], [4, 28, 56, 84, 112]],
	[thirties, [25, 12, 40, 34], [4, 32, 60, 88, 116]],
	[thirties, [26, 13, 42, 35], [4, 24, 48, 72, 96, 120]],
	[thirties, [28, 14, 45, 38], [4, 28, 52, 76, 100, 124]],
	[thirties, [29, 15, 48, 40], [4, 24, 50, 76, 102, 128]],
	[thirties, [31, 16, 51, 43], [4, 28, 54, 80, 106, 132]],
	[thirties, [33, 17, 54, 45], [4, 32, 58, 84, 110, 136]],
	[thirties, [35, 18, 57, 48], [4, 28, 56, 84, 112, 140]],
	[thirties, [37, 19, 60, 51], [4, 32, 60, 88, 116, 144]],
	[thirties, [38, 19, 63, 53], [4, 28, 52, 76, 100, 124, 148]],
	[thirties, [40, 20, 66, 56], [4, 22, 48, 74, 100, 126, 152]],
	[thirties, [43, 21, 70, 59], [4, 26, 52, 78, 104, 130, 156]],
	[thirties, [45, 22, 74, 62], [4, 30, 56, 82, 108, 134, 160]],
	[thirties, [47, 24, 77, 65], [4, 24, 52, 80, 108, 136, 164]],
	[thirties, [49, 25, 81, 68], [4, 28, 56, 84, 112, 140, 168]],
] as const

// prettier-ignore
export type Version =
	| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
	| 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
	| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30
	| 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40

const MAX_VERSION = 40

export type Mask = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

// mode constants (cf. Table 2 in JIS X 0510:2004 p. 16)
const MODE_TERMINATOR = 0

export const MODE_NUMERIC = 1
export const MODE_ALPHANUMERIC = 2
export const MODE_OCTET = 4

export type MODE =
	| typeof MODE_NUMERIC
	| typeof MODE_ALPHANUMERIC
	| typeof MODE_OCTET

// ECC levels (cf. Table 22 in JIS X 0510:2004 p. 45)
export const ECCLEVEL_L = 1
export const ECCLEVEL_M = 0
export const ECCLEVEL_Q = 3
export const ECCLEVEL_H = 2

export type ECCLEVEL =
	| typeof ECCLEVEL_L
	| typeof ECCLEVEL_M
	| typeof ECCLEVEL_Q
	| typeof ECCLEVEL_H

// GF(2^8)-to-integer mapping with a reducing polynomial x^8+x^4+x^3+x^2+1
// invariant: GF256_MAP[GF256_INVMAP[i]] == i for all i in [1,256)
const GF256_MAP: number[] = []
const GF256_INVMAP: number[] = [-1]
for (let i = 0, v = 1; i < 255; ++i) {
	GF256_MAP.push(v)
	GF256_INVMAP[v] = i
	v = (v * 2) ^ (v >= 128 ? 0x11d : 0)
}

// generator polynomials up to degree 30
// (should match with polynomials in JIS X 0510:2004 Appendix A)
//
// generator polynomial of degree K is product of (x-\alpha^0), (x-\alpha^1),
// ..., (x-\alpha^(K-1)). by convention, we omit the K-th coefficient (always 1)
// from the result; also other coefficients are written in terms of the exponent
// to \alpha to avoid the redundant calculation. (see also calculateecc below.)
const GF256_GENPOLY: number[][] = [[]]
for (let i = 0; i < 30; ++i) {
	const prevpoly = GF256_GENPOLY[i]
	const poly: number[] = []
	for (let j = 0; j <= i; ++j) {
		const a = j < i ? GF256_MAP[prevpoly[j]] : 0
		const b = GF256_MAP[(i + (prevpoly[j - 1] || 0)) % 255]
		poly.push(GF256_INVMAP[a ^ b])
	}
	GF256_GENPOLY.push(poly)
}

const A = 65 // 'A'.charCodeAt()
const Z = 90 // 'Z'.charCodeAt()
const ZERO = 0x30 // '0'.charCodeAt()
const NINE = 0x39 // '9'.charCodeAt()
const DIGIT_LEN = NINE - ZERO + 1
const ALPHA_LEN = Z - A + 1

// alphanumeric character mapping (cf. Table 5 in JIS X 0510:2004 p. 19)
// const ALPHANUMERIC_MAP = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const ALPHANUMERIC_MAP_INDEX = (x: string): number => {
	const c = x.charCodeAt(0)
	if (c <= NINE && c >= ZERO) {
		return c - ZERO
	}

	if (c >= A && c <= Z) {
		return c - (A - DIGIT_LEN)
	}

	return DIGIT_LEN + ALPHA_LEN + ' $%*+-./:'.indexOf(x)
}

// mask functions in terms of row # and column #
// (cf. Table 20 in JIS X 0510:2004 p. 42)
const MASKFUNCS: ((i: number, j: number) => boolean)[] = [
	(i, j): boolean => (i + j) % 2 === 0,
	(i, _): boolean => i % 2 === 0,
	(_, j): boolean => j % 3 === 0,
	(i, j): boolean => (i + j) % 3 === 0,
	(i, j): boolean => (((i / 2) | 0) + ((j / 3) | 0)) % 2 === 0,
	(i, j): boolean => ((i * j) % 2) + ((i * j) % 3) === 0,
	(i, j): boolean => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
	(i, j): boolean => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
]

// returns true when the version information has to be embeded.
const needsverinfo = (ver: Version): boolean => ver > 6

// returns the size of entire QR code for given version.
const getsizebyver = (ver: Version): number => 4 * ver + 17

// returns the number of bits available for code words in this version.
const nfullbits = (ver: Version): number => {
	/*
	 * |<--------------- n --------------->|
	 * |        |<----- n-17 ---->|        |
	 * +-------+                ///+-------+ ----
	 * |       |                ///|       |    ^
	 * |  9x9  |       @@@@@    ///|  9x8  |    |
	 * |       | # # # @5x5@ # # # |       |    |
	 * +-------+       @@@@@       +-------+    |
	 *       #                               ---|
	 *                                        ^ |
	 *       #                                |
	 *     @@@@@       @@@@@       @@@@@      | n
	 *     @5x5@       @5x5@       @5x5@   n-17
	 *     @@@@@       @@@@@       @@@@@      | |
	 *       #                                | |
	 * //////                                 v |
	 * //////#                               ---|
	 * +-------+       @@@@@       @@@@@        |
	 * |       |       @5x5@       @5x5@        |
	 * |  8x9  |       @@@@@       @@@@@        |
	 * |       |                                v
	 * +-------+                             ----
	 *
	 * when the entire code has n^2 modules and there are m^2-3 alignment
	 * patterns, we have:
	 * - 225 (= 9x9 + 9x8 + 8x9) modules for finder patterns and
	 *   format information;
	 * - 2n-34 (= 2(n-17)) modules for timing patterns;
	 * - 36 (= 3x6 + 6x3) modules for version information, if any;
	 * - 25m^2-75 (= (m^2-3)(5x5)) modules for alignment patterns
	 *   if any, but 10m-20 (= 2(m-2)x5) of them overlaps with
	 *   timing patterns.
	 */
	const v = VERSIONS[ver]
	let nbits = 16 * ver * ver + 128 * ver + 64 // finder, timing and format info.
	// eslint-disable-next-line spaced-comment
	if (/*@__INLINE__*/ needsverinfo(ver)) nbits -= 36 // version information
	if (v[2].length) {
		// alignment patterns
		nbits -= 25 * v[2].length * v[2].length - 10 * v[2].length - 55
	}
	return nbits
}

// returns the number of bits available for data portions (i.e. excludes ECC
// bits but includes mode and length bits) in this version and ECC level.
const ndatabitsPre = (ver: Version, ecclevel: ECCLEVEL): number => {
	// eslint-disable-next-line spaced-comment
	let nbits = /*@__INLINE__*/ nfullbits(ver) & ~7 // no sub-octet code words
	const v = VERSIONS[ver]
	nbits -= 8 * v[0][ecclevel] * v[1][ecclevel] // ecc bits
	return nbits
}

const ndatabitsMatrix = Array.from({ length: 4 }, (_, ecclevel) =>
	Array.from({ length: MAX_VERSION }, (_, versionPred) =>
		ndatabitsPre((versionPred + 1) as Version, ecclevel as ECCLEVEL),
	),
)

const ndatabits = (ver: Version, ecclevel: ECCLEVEL): number =>
	ndatabitsMatrix[ecclevel][ver - 1]

// returns the number of bits required for the length of data.
// (cf. Table 3 in JIS X 0510:2004 p. 16)
const ndatalenbits = (ver: Version, mode: MODE): number => {
	switch (mode) {
	case MODE_NUMERIC:
		return ver < 10 ? 10 : ver < 27 ? 12 : 14
	case MODE_ALPHANUMERIC:
		return ver < 10 ? 9 : ver < 27 ? 11 : 13
	case MODE_OCTET:
		return ver < 10 ? 8 : 16
	}
}

// returns the maximum length of data possible in given configuration.
const getmaxdatalen = (
	ver: Version,
	mode: MODE,
	ecclevel: ECCLEVEL,
): number => {
	const nbits = ndatabits(ver, ecclevel) - 4 - ndatalenbits(ver, mode) // 4 for mode bits
	switch (mode) {
	case MODE_NUMERIC:
		return (
			((nbits / 10) | 0) * 3
				+ (nbits % 10 < 4 ? 0 : nbits % 10 < 7 ? 1 : 2)
		)
	case MODE_ALPHANUMERIC:
		return ((nbits / 11) | 0) * 2 + (nbits % 11 < 6 ? 0 : 1)
	case MODE_OCTET:
		return (nbits / 8) | 0
	}
}

// returns the code words (sans ECC bits) for given data and configurations.
// requires data to be preprocessed by validatedata. no length check is
// performed, and everything has to be checked before calling this function.
const encode = (
	ver: Version,
	mode: MODE,
	data: string | Uint8Array,
	maxbuflen: number,
): number[] => {
	const buf = []
	let bits = 0
	let remaining = 8
	const datalen = data.length

	// this function is intentionally no-op when n=0.
	const pack = (x: number, n: number): void => {
		if (n >= remaining) {
			buf.push(bits | (x >> (n -= remaining)))
			while (n >= 8) buf.push((x >> (n -= 8)) & 255)
			bits = 0
			remaining = 8
		}
		if (n > 0) bits |= (x & ((1 << n) - 1)) << (remaining -= n)
	}

	const nlenbits = ndatalenbits(ver, mode)
	pack(mode, 4)
	pack(datalen, nlenbits)

	if (mode === MODE_OCTET) {
		for (let i = 0; i < datalen; ++i) {
			pack((data as Uint8Array)[i], 8)
		}
	} else {
		const stringData = data as string

		if (mode === MODE_ALPHANUMERIC) {
			for (let i = 1; i < datalen; i += 2) {
				pack(
					ALPHANUMERIC_MAP_INDEX(stringData[i - 1]) * 45
					+ ALPHANUMERIC_MAP_INDEX(stringData[i]),
					11,
				)
			}

			if (datalen % 2 === 1) {
				pack(ALPHANUMERIC_MAP_INDEX(stringData[datalen - 1]), 6)
			}
		} else {
			for (let i = 2; i < datalen; i += 3) {
				pack(+stringData.substring(i - 2, i + 1), 10)
			}

			const mod = datalen % 3
			if (mod > 0) {
				pack(+stringData.substring(datalen - mod), mod * 3 + 1)
			}
		}
	}

	// final bits. it is possible that adding terminator causes the buffer
	// to overflow, but then the buffer truncated to the maximum size will
	// be valid as the truncated terminator mode bits and padding is
	// identical in appearance (cf. JIS X 0510:2004 sec 8.4.8).
	pack(MODE_TERMINATOR, 4)
	if (remaining < 8) buf.push(bits)

	// the padding to fill up the remaining space. we should not add any
	// words when the overflow already occurred.
	while (buf.length + 1 < maxbuflen) buf.push(0xec, 0x11)
	if (buf.length < maxbuflen) buf.push(0xec)
	return buf
}

// calculates ECC code words for given code words and generator polynomial.
//
// this is quite similar to CRC calculation as both Reed-Solomon and CRC use
// the certain kind of cyclic codes, which is effectively the division of
// zero-augumented polynomial by the generator polynomial. the only difference
// is that Reed-Solomon uses GF(2^8), instead of CRC's GF(2), and Reed-Solomon
// uses the different generator polynomial than CRC's.
const calculateecc = function (poly: number[], genpoly: number[]): number[] {
	const modulus = poly.slice(0)
	const polylen = poly.length
	const genpolylen = genpoly.length
	for (let i = 0; i < genpolylen; ++i) modulus.push(0)
	for (let i = 0; i < polylen;) {
		const quotient = GF256_INVMAP[modulus[i++]]
		if (quotient >= 0) {
			for (let j = 0; j < genpolylen; ++j) {
				modulus[i + j] ^= GF256_MAP[(quotient + genpoly[j]) % 255]
			}
		}
	}
	return modulus.slice(polylen)
}

// auguments ECC code words to given code words. the resulting words are
// ready to be encoded in the matrix.
//
// the much of actual augumenting procedure follows JIS X 0510:2004 sec 8.7.
// the code is simplified using the fact that the size of each code & ECC
// blocks is almost same; for example, when we have 4 blocks and 46 data words
// the number of code words in those blocks are 11, 11, 12, 12 respectively.
const augumenteccs = (
	poly: number[],
	nblocks: number,
	genpoly: number[],
): number[] => {
	const subsizes = []
	const subsize = (poly.length / nblocks) | 0
	let subsize0 = 0
	const pivot = nblocks - (poly.length % nblocks)
	for (let i = 0; i < pivot; ++i) {
		subsizes.push(subsize0)
		subsize0 += subsize
	}
	for (let i = pivot; i < nblocks; ++i) {
		subsizes.push(subsize0)
		subsize0 += subsize + 1
	}
	subsizes.push(subsize0)

	const eccs = []
	for (let i = 0; i < nblocks; ++i) {
		eccs.push(
			calculateecc(poly.slice(subsizes[i], subsizes[i + 1]), genpoly),
		)
	}

	const result = []
	const nitemsperblock = (poly.length / nblocks) | 0
	for (let i = 0; i < nitemsperblock; ++i) {
		for (let j = 0; j < nblocks; ++j) {
			result.push(poly[subsizes[j] + i])
		}
	}
	for (let j = pivot; j < nblocks; ++j) {
		result.push(poly[subsizes[j + 1] - 1])
	}
	for (let i = 0; i < genpoly.length; ++i) {
		for (let j = 0; j < nblocks; ++j) {
			result.push(eccs[j][i])
		}
	}
	return result
}

// auguments BCH(p+q,q) code to the polynomial over GF(2), given the proper
// genpoly. the both input and output are in binary numbers, and unlike
// calculateecc genpoly should include the 1 bit for the highest degree.
//
// actual polynomials used for this procedure are as follows:
// - p=10, q=5, genpoly=x^10+x^8+x^5+x^4+x^2+x+1 (JIS X 0510:2004 Appendix C)
// - p=18, q=6, genpoly=x^12+x^11+x^10+x^9+x^8+x^5+x^2+1 (ibid. Appendix D)
const augumentbch = function (
	poly: number,
	p: number,
	genpoly: number,
	q: number,
): number {
	let modulus = poly << q
	for (let i = p - 1; i >= 0; --i) {
		if ((modulus >> (q + i)) & 1) modulus ^= genpoly << i
	}
	return (poly << q) | modulus
}

// creates the base matrix for given version. it returns two matrices, one of
// them is the actual one and the another represents the "reserved" portion
// (e.g. finder and timing patterns) of the matrix.
//
// some entries in the matrix may be undefined, rather than 0 or 1. this is
// intentional (no initialization needed!), and putdata below will fill
// the remaining ones.
const makebasematrixPre = (
	ver: Version,
): { matrix: Bit[][], reserved: Bit[][], } => {
	const aligns = VERSIONS[ver][2]
	// eslint-disable-next-line spaced-comment
	const n = /*@__INLINE__*/ getsizebyver(ver)
	const matrix: Bit[][] = []
	const reserved: Bit[][] = []
	for (let i = 0; i < n; ++i) {
		matrix.push([])
		reserved.push([])
	}

	const blit = (
		y: number,
		x: number,
		h: number,
		w: number,
		bits: number[],
	): void => {
		for (let i = 0; i < h; ++i) {
			for (let j = 0; j < w; ++j) {
				matrix[y + i][x + j] = ((bits[i] >> j) & 1) as Bit
				reserved[y + i][x + j] = 1
			}
		}
	}

	// finder patterns and a part of timing patterns
	// will also mark the format information area (not yet written) as reserved.
	blit(0, 0, 9, 9, [0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x17f, 0x00, 0x40])
	blit(n - 8, 0, 8, 9, [0x100, 0x7f, 0x41, 0x5d, 0x5d, 0x5d, 0x41, 0x7f])
	blit(0, n - 8, 9, 8, [0xfe, 0x82, 0xba, 0xba, 0xba, 0x82, 0xfe, 0x00, 0x00])

	// the rest of timing patterns
	for (let i = 9; i < n - 8; ++i) {
		matrix[6][i] = matrix[i][6] = (~i & 1) as Bit
		reserved[6][i] = reserved[i][6] = 1
	}

	// alignment patterns
	const m = aligns.length
	for (let i = 0; i < m; ++i) {
		const minj = i === 0 || i === m - 1 ? 1 : 0
		const maxj = i === 0 ? m - 1 : m
		for (let j = minj; j < maxj; ++j) {
			blit(aligns[i], aligns[j], 5, 5, [0x1f, 0x11, 0x15, 0x11, 0x1f])
		}
	}

	// version information
	// eslint-disable-next-line spaced-comment
	if (/*@__INLINE__*/ needsverinfo(ver)) {
		const code = augumentbch(ver, 6, 0x1f25, 12)
		let k = 0
		for (let i = 0; i < 6; ++i) {
			for (let j = 0; j < 3; ++j) {
				const bit = ((code >> k++) & 1) as Bit
				matrix[i][n - 11 + j] = bit
				matrix[n - 11 + j][i] = bit
				reserved[i][n - 11 + j] = reserved[n - 11 + j][i] = 1
			}
		}
	}

	return { matrix, reserved }
}

const makebasematrixMatrix = Array.from(
	{ length: MAX_VERSION },
	// eslint-disable-next-line spaced-comment
	(_, i) => /*@__INLINE__*/ makebasematrixPre((i + 1) as Version),
)

const makebasematrix = (version: Version): {
	matrix: Bit[][]
	reserved: Bit[][]
} => makebasematrixMatrix[version - 1]

// fills the data portion (i.e. unmarked in reserved) of the matrix with given
// code words. the size of code words should be no more than available bits,
// and remaining bits are padded to 0 (cf. JIS X 0510:2004 sec 8.7.3).
const putdata = (
	matrix: Bit[][],
	reserved: Bit[][],
	buf: number[],
): typeof matrix => {
	const n = matrix.length
	let k = 0
	let dir = -1
	for (let i = n - 1; i >= 0; i -= 2) {
		if (i === 6) --i // skip the entire timing pattern column
		let jj = dir < 0 ? n - 1 : 0
		for (let j = 0; j < n; ++j) {
			for (let ii = i; ii > i - 2; --ii) {
				if (!reserved[jj][ii]) {
					// may overflow, but (undefined >> x)
					// is 0 so it will auto-pad to zero.
					matrix[jj][ii] = ((buf[k >> 3] >> (~k & 7)) & 1) as Bit
					++k
				}
			}
			jj += dir
		}
		dir = -dir
	}
	return matrix
}

// XOR-masks the data portion of the matrix. repeating the call with the same
// arguments will revert the prior call (convenient in the matrix evaluation).
const maskdata = (
	matrix: Bit[][],
	reserved: Bit[][],
	mask: number,
): typeof matrix => {
	const maskf = MASKFUNCS[mask]
	const n = matrix.length
	for (let i = 0; i < n; ++i) {
		for (let j = 0; j < n; ++j) {
			if (!reserved[i][j] && maskf(i, j)) matrix[i][j] ^= 1
		}
	}
	return matrix
}

// puts the format information.
const putformatinfo = (
	matrix: Bit[][],
	ecclevel: ECCLEVEL,
	mask: number,
): typeof matrix => {
	const n = matrix.length
	const code = augumentbch((ecclevel << 3) | mask, 5, 0x537, 10) ^ 0x5412

	// prettier-ignore
	const rows = [
		0, 1, 2, 3, 4, 5, 7, 8,
		n - 7, n - 6, n - 5, n - 4, n - 3, n - 2, n - 1,
	]

	// prettier-ignore
	const cols = [
		n - 1, n - 2, n - 3, n - 4, n - 5, n - 6, n - 7, n - 8,
		7, 5, 4, 3, 2, 1, 0,
	]

	for (let i = 0; i < 15; ++i) {
		const r = rows[i]
		const c = cols[i]
		matrix[r][8] = matrix[8][c] = ((code >> i) & 1) as Bit
		// we don't have to mark those bits reserved; always done
		// in makebasematrix above.
	}
	return matrix
}

// evaluates the resulting matrix and returns the score (lower is better).
// (cf. JIS X 0510:2004 sec 8.8.2)
//
// the evaluation procedure tries to avoid the problematic patterns naturally
// occuring from the original matrix. for example, it penaltizes the patterns
// which just look like the finder pattern which will confuse the decoder.
// we choose the mask which results in the lowest score among 8 possible ones.
//
// note: zxing seems to use the same procedure and in many cases its choice
// agrees to ours, but sometimes it does not. practically it doesn't matter.

// N1+(k-5) points for each consecutive row of k same-colored modules,
// where k >= 5. no overlapping row counts.
const PENALTY_CONSECUTIVE = 3

// N2 points for each 2x2 block of same-colored modules.
// overlapping block does count.
const PENALTY_TWOBYTWO = 3

// N3 points for each pattern with >4W:1B:1W:3B:1W:1B or
// 1B:1W:3B:1W:1B:>4W, or their multiples (e.g. highly unlikely,
// but 13W:3B:3W:9B:3W:3B counts).
const PENALTY_FINDERLIKE = 40

// N4*k points for every (5*k)% deviation from 50% black density.
// i.e. k=1 for 55~60% and 40~45%, k=2 for 60~65% and 35~40%, etc.
const PENALTY_DENSITY = 10

const evaluatematrix = (matrix: Bit[][]): number => {
	const evaluategroup = (groups: number[]): number => {
		// assumes [W,B,W,B,W,...,B,W]
		let score = 0
		for (let i = 0; i < groups.length; ++i) {
			if (groups[i] >= 5) score += PENALTY_CONSECUTIVE + (groups[i] - 5)
		}
		for (let i = 5; i < groups.length; i += 2) {
			const p = groups[i]
			if (
				groups[i - 1] === p
				&& groups[i - 2] === 3 * p
				&& groups[i - 3] === p
				&& groups[i - 4] === p
				&& (groups[i - 5] >= 4 * p || groups[i + 1] >= 4 * p)
			) {
				// this part differs from zxing...
				score += PENALTY_FINDERLIKE
			}
		}
		return score
	}

	const n = matrix.length
	let score = 0
	let nblacks = 0
	for (let i = 0; i < n; ++i) {
		const row = matrix[i]

		// evaluate the current row
		const rowGroups = [0] // the first empty group of white
		for (let j = 0; j < n;) {
			let k
			for (k = 0; j < n && row[j]; ++k) ++j
			rowGroups.push(k)
			for (k = 0; j < n && !row[j]; ++k) ++j
			rowGroups.push(k)
		}
		score += evaluategroup(rowGroups)

		// evaluate the current column
		const columnGroups = [0]
		for (let j = 0; j < n;) {
			let k
			for (k = 0; j < n && matrix[j][i]; ++k) ++j
			columnGroups.push(k)
			for (k = 0; j < n && !matrix[j][i]; ++k) ++j
			columnGroups.push(k)
		}
		score += evaluategroup(columnGroups)

		// check the 2x2 box and calculate the density
		const nextrow = matrix[i + 1] || []
		nblacks += row[0]
		for (let j = 1; j < n; ++j) {
			const p = row[j]
			nblacks += p
			// at least comparison with next row should be strict...
			if (row[j - 1] === p && nextrow[j] === p && nextrow[j - 1] === p) {
				score += PENALTY_TWOBYTWO
			}
		}
	}

	score += PENALTY_DENSITY * ((abs(nblacks / n / n - 0.5) / 0.05) | 0)
	return score
}

const bufWithEccs = (
	buf: number[],
	version: Version,
	ecclevel: ECCLEVEL,
): number[] => {
	const v = VERSIONS[version]
	return augumenteccs(buf, v[1][ecclevel], GF256_GENPOLY[v[0][ecclevel]])
}

// returns the fully encoded QR code matrix which contains given data.
// it also chooses the best mask automatically when mask is -1.
const generate = (
	data: string | Uint8Array,
	version: Version,
	mode: MODE,
	ecclevel: ECCLEVEL,
): Bit[][] => {
	// eslint-disable-next-line spaced-comment
	let buf = /*@__INLINE__*/ encode(
		version, mode, data, ndatabits(version, ecclevel) >> 3,
	)
	// eslint-disable-next-line spaced-comment
	buf = /*@__INLINE__*/ bufWithEccs(buf, version, ecclevel)

	// eslint-disable-next-line spaced-comment
	const { matrix, reserved } = /*@__INLINE__*/ makebasematrix(version)
	putdata(matrix, reserved, buf)

	const scoreMask = (mask: Mask): number => {
		maskdata(matrix, reserved, mask)

		putformatinfo(matrix, ecclevel, mask)
		const score = evaluatematrix(matrix)

		maskdata(matrix, reserved, mask)

		return score
	}
	// find the best mask
	let bestmask: Mask = 0
	let bestscore = scoreMask(bestmask)

	for (let mask = 1; mask < 8; ++mask) {
		const score = scoreMask(bestmask)
		if (bestscore > score) {
			bestscore = score
			bestmask = mask as Mask
		}
	}

	maskdata(matrix, reserved, bestmask)
	putformatinfo(matrix, ecclevel, bestmask)
	return matrix
}

const guessVersion = (
	data: string | Uint8Array,
	ecclevel: ECCLEVEL,
): (() => Bit[][]) => {
	let mode: MODE = MODE_OCTET

	if (typeof data === 'string') {
		if (/^[0-9]*$/.test(data)) {
			mode = MODE_NUMERIC
		} else if (/^[A-Z0-9 $%*+\-./:]*$/.test(data)) {
			mode = MODE_ALPHANUMERIC
		} else {
			data = (new TextEncoder).encode(data)
		}
	}

	let version: Version = 1
	const len = data.length
	for (; version <= 40; ++version) {
		// eslint-disable-next-line spaced-comment
		if (len <= /*@__INLINE__*/ getmaxdatalen(
			version as Version, mode, ecclevel,
		)) {
			return (): Bit[][] =>
				generate(data, version as Version, mode, ecclevel)
		}
	}

	throw new Error('data is too large')
}

export const generateFromText = (
	data: string | Uint8Array,
	ecclevel: ECCLEVEL = ECCLEVEL_L,
): Bit[][] => {
// eslint-disable-next-line spaced-comment
	return /*@__INLINE__*/ guessVersion(data, ecclevel)()
}
