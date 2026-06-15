import { visit } from 'unist-util-visit';

/** @typedef {import('mdast').Root} Root */
/** @typedef {import('mdast').Paragraph} Paragraph */
/** @typedef {import('mdast').Parent} Parent */

/**
 * @param {string} el
 * @param {Record<string, string | number | boolean | undefined>} [attrs]
 * @param {import('mdast').PhrasingContent[]} [children]
 * @returns {Paragraph}
 */
function h(el, attrs = {}, children = []) {
	return {
		type: 'paragraph',
		data: { hName: el, hProperties: attrs },
		children,
	};
}

/**
 * @param {'github' | 'codeberg'} platform
 * @param {string} author
 */
function profileUrls(platform, author) {
	const normalized = author.replace(/^@/, '');

	if (platform === 'github') {
		return {
			profile: `https://github.com/${normalized}`,
			avatar: `https://github.com/${normalized}.png?size=80`,
		};
	}

	return {
		profile: `https://codeberg.org/${normalized}`,
		avatar: `https://codeberg.org/${normalized}.png?size=80`,
	};
}

/**
 * Renders `:::quote` container directives as styled quote boxes with profile avatars.
 *
 * @example
 * :::quote{author="yiyoungliu" platform="codeberg"}
 * Good commit habits reflect on the developer.
 * :::
 */
export function remarkQuote() {
	return function transformer(/** @type {Root} */ tree) {
		visit(tree, (node, index, parent) => {
			if (
				!parent ||
				index === undefined ||
				node.type !== 'containerDirective' ||
				node.name !== 'quote'
			) {
				return;
			}

			const author = node.attributes?.author;
			if (!author) {
				throw new Error('Quote directive requires an `author` attribute.');
			}

			const platform = node.attributes?.platform === 'github' ? 'github' : 'codeberg';
			const name = node.attributes?.name ?? author.replace(/^@/, '');
			const { profile, avatar } = profileUrls(platform, author);

			/** @type {Parent} */
			const quote = {
				type: 'paragraph',
				data: { hName: 'figure', hProperties: { class: 'doc-quote' } },
				children: [
					h('blockquote', { class: 'doc-quote__text' }, node.children),
					h('a', {
						class: 'doc-quote__author',
						href: profile,
						target: '_blank',
						rel: 'noopener noreferrer',
						'aria-label': `${name} on ${platform}`,
					}, [
						h('img', {
							class: 'doc-quote__avatar',
							src: avatar,
							alt: name,
							width: 40,
							height: 40,
							loading: 'lazy',
							decoding: 'async',
						}),
					]),
				],
			};

			parent.children[index] = quote;
		});
	};
}
