import { resolve } from 'path'
import { ProgressPlugin } from 'webpack'

import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import OptimizeCssAssetsPlugin from 'optimize-css-assets-webpack-plugin'
import SriPlugin from 'webpack-subresource-integrity'

const path = resolve.bind(null, __dirname)

const typescript = {
	exclude: [/node_modules/],
	test: /\.tsx?$/,
}

export default {
	mode: 'production',
	entry: path('src', 'index.ts'),

	output: {
		filename: '[name].[chunkhash].js',
		path: path('dist'),
	},

	plugins: [
		new ProgressPlugin,
		new MiniCssExtractPlugin({ filename: 'index.css', ignoreOrder: false }),
		new HtmlWebpackPlugin({
			template: path('src', 'index.pug'),
			inject: false,
		}),
		new SriPlugin({
			hashFuncNames: ['sha384']
		}),
	],

	module: {
		rules: [
			{
				...typescript,
				use: 'ts-loader',
			},

			{
				...typescript,
				enforce: 'pre',
				use: 'eslint-loader',
			},

			{
				test: /\.pug$/,
				use: 'pug-loader',
			},

			{
				test: /\.sass$/,
				use: [
					{ loader: MiniCssExtractPlugin.loader },
					'css-loader',
					'sass-loader',
				],
			},
		],
	},

	optimization: {
		minimizer: [new TerserPlugin({
			terserOptions: {
				ecma: 5,
				warnings: true,
				mangle: {
					properties: true,
					eval: true,
				},
				compress: {
					// booleans_as_integers: true,
					drop_console: true,
					expression: true,
					hoist_funs: true,
					keep_fargs: false,
					passes: 3,
					unsafe: true,
					unsafe_arrows: true,
					unsafe_comps: true,
					unsafe_Function: true,
					unsafe_math: true,
					unsafe_methods: true,
					unsafe_proto: true,
					unsafe_regexp: true,
					unsafe_undefined: true,
					warnings: true,
				},
				module: true,
				toplevel: true,
			},
		}), (new OptimizeCssAssetsPlugin)],
		removeAvailableModules: true,
		usedExports: true,
	},

	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.pug', 'sass'],
	},
}
