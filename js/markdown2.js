/*
 * Version 2.0 of markdown.js
 */

/*
 * Splits a string into an array of substrings with the given length. If the
 * string does not divide evenly into the specified length, then the last
 * element will contain the remaining characters.
 *
 * str		The string to split
 * len		The length of the substrings to split
 * Returns an array of the substrings.
 */
function splitLength(str, len) {
	let substrings = [];
	let current = "";

	for (const ch of str) {
		if (current.length !== 0 && current.length % len === 0) {
			// current is correct length
			substrings.push(current);
			current = ch;
		} else {
			current += ch;
		}
	}
	substrings.push(current);

	return substrings;
}

/*
 * Split markdown into its constituent tokens
 *
 * markdown		The markdown to tokenize
 * Returns an array containing the separated tokens
 */
function tokenizeMarkdown(markdown) {
	const specialChars = "#*_~`^![]()\"|:>.)\n";

	let tokens = [];
	let currentToken = "";
	let escapeNext = false;

	for (const ch of markdown) {
		const last = currentToken[currentToken.length-1] ?? "";

		if (escapeNext) {
			// Escape chars after backslashes
			if (currentToken !== "") {
				tokens.push(currentToken);
				currentToken = "";
			}

			tokens.push(`&#${ch.charCodeAt(0)};`);
			escapeNext = false;
		} else if (ch === '\\') {
			escapeNext = true;
		} else if (currentToken === "") {
			// No current token
			currentToken = ch;
		} else if (specialChars.includes(ch)) {
			// Current char is a special character
			if (last === ch) {
				// last char is the same as this
				currentToken += ch;
			} else {
				// last char was not a special char
				tokens.push(currentToken);
				currentToken = ch;
			}
		} else {
			// current char is not a special char
			if (specialChars.includes(last)) {
				// last char was a special char
				tokens.push(currentToken);
				currentToken = ch;
			} else {
				// last char also is not a special char
				currentToken += ch;
			}
		}
	}
	tokens.push(currentToken);

	return tokens;
}

/*
 * Parses a resource like an image or a link into an object containing a
 * source, alt text, and a title. Also returns the "offset"; how much of the
 * stack was consumed.
 */
function parseResource(stack) {
	if (stack.length < 3) return null;  // Not a valid image

	let resource = {
		src: null,
		alt: null,
		title: null,
		offset: 0
	};
	let index = 0;

	// look for alt text
	if (stack[resource.offset] === '[') {
		// Found beginning of alt text
		let altText = "";
		++resource.offset;

		for (; resource.offset < stack.length; ++resource.offset) {
			if (stack[resource.offset] === ']') {
				// Found end of alt text
				resource.alt = altText;
				break;
			} else {
				altText += stack[resource.offset];
			}
		}

		if (resource.alt === null) return null;  // Not a valid resource
	}

	++resource.offset;
	if (resource.offset > stack.length) return resource;

	// Look for src and title
	if (stack[resource.offset] === '(') {
		// Found beginning of src
		let parseStep = 0;  // 0 = src, 1 = title, 2 = done
		let str = "";
		++resource.offset;

		for (; parseStep !== 2 && resource.offset < stack.length; ++resource.offset) {
			if (stack[resource.offset] === ')') {
				if (parseStep === 0) {
					// src
					resource.src = str;
				}

				parseStep = 2;
				break;
			} else if (stack[resource.offset] === '"') {
				if (parseStep === 0) {
					// switch to title
					resource.src = str;
					str = "";
					parseStep = 1;
					continue;
				} else if (parseStep === 1) {
					// end title
					resource.title = str;
					parseStep = 2
				}
			}

			str += stack[resource.offset];
		}
	}

	return resource;
}

/*
 * Find last index of token in string
 *
 * array	The array to search
 * token	The token to search for
 * Returns the index of the token, or -1 if no token found
 */
function rfind(array, token) {
	for (let j=array.length-1; j >= 0; --j) {
		if (array[j] === token) {
			return j;
		}
	}
	return -1;
}

/*
 * Parses inline markdown elements.
 *
 * tokens	An array of tokens to parse
 * Returns an array of strings containing the HTML version of the given
 * markdown.
 */
function parseInlineMarkdown(tokens) {
	let stack = [];

	/*
	 * Reduce all elements in stack after and including index into one string
	 */
	let reduce_stack = (index) => {
		let reduced = stack.slice(index).join('');
		stack.splice(index, stack.length, reduced);
	};

	for (let i=0; i < tokens.length; ++i) {
		let token = tokens[i];

		if (token.startsWith("*")) {
			let match;

			if (token.length > 2) {
				// Lexer made the token too long
				// Split up the token into valid subtokens and replace them
				let splitTokens = splitLength(token, 2);

				let forwardMatch = rfind(stack, splitTokens[0]);
				let backwardMatch = rfind(stack, splitTokens[splitTokens.length - 1]);

				if (backwardMatch > forwardMatch) {
					// This token works better if the split version is reversed
					splitTokens.reverse();
					match = backwardMatch;
				} else {
					match = forwardMatch;
				}

				tokens.splice(i, 1, ...splitTokens);
				token = tokens[i];  // get new shortened token
			} else {
				// Search backwards through parse stack for matching token
				match = rfind(stack, token);
			}

			if (match !== -1) {
				// A match was found!
				if (token.length === 2) {
					/* Bold */
					stack[match] = "<b>";
					stack.push("</b>");
				} else {
					/* Italic */
					stack[match] = "<i>";
					stack.push("</i>");
				}
				reduce_stack(match);
			} else {
				stack.push(token);
			}
		} else if (token.startsWith("_")) {
			let match;

			if (token.length > 2) {
				// Lexer made the token too long
				// Split up the token into valid subtokens and replace them
				let splitTokens = splitLength(token, 2);

				let forwardMatch = rfind(stack, splitTokens[0]);
				let backwardMatch = rfind(stack, splitTokens[splitTokens.length - 1]);

				if (backwardMatch > forwardMatch) {
					// This token works better if the split version is reversed
					splitTokens.reverse();
					match = backwardMatch;
				} else {
					match = forwardMatch;
				}

				tokens.splice(i, 1, ...splitTokens);
				token = tokens[i];  // get new shortened token
			} else {
				// Search backwards through parse stack for matching token
				match = rfind(stack, token);
			}

			if (match !== -1) {
				// A match was found!
				if (token.length === 2) {
					/* Underline */
					stack[match] = "<u>";
					stack.push("</u>");
				} else {
					/* Subscript */
					stack[match] = "<sub>";
					stack.push("</sub>");
				}
				reduce_stack(match);
			} else {
				stack.push(token);
			}
		} else if (token.startsWith("~~")) {
			/* Strikethrough */
			if (token.length > 2) {
				tokens.splice(i, 1, ...splitLength(token, 2));
				token = tokens[i];  // get new shortened token
			}

			// Search backwards through parse stack for matching token
			let match = rfind(stack, token);

			if (match !== -1) {
				// A match was found!
				stack[match] = "<s>";
				stack.push("</s>");
				reduce_stack(match);
			} else {
				stack.push(token);
			}
		} else if (token.startsWith("`")) {
			/* Code */
			if (token.length > 1) {
				tokens.splice(i, 1, ...splitLength(token, 1));
				token = tokens[i];  // get new shortened token
			}

			// Search backwards through parse stack for matching token
			let match = rfind(stack, token);

			if (match !== -1) {
				// A match was found!
				stack[match] = "<code>";
				stack.push("</code>");
				reduce_stack(match);
			} else {
				stack.push(token);
			}
		} else if (token.startsWith("^")) {
			/* Superscript */
			if (token.length > 1) {
				tokens.splice(i, 1, ...splitLength(token, 1));
				token = tokens[i];  // get new shortened token
			}

			// Search backwards through parse stack for matching token
			let match = rfind(stack, token);

			if (match !== -1) {
				// A match was found!
				stack[match] = "<sup>";
				stack.push("</sup>");
				reduce_stack(match);
			} else {
				stack.push(token);
			}
		} else if (token === ']' || token === ")") {
			/* Links */
			stack.push(token);

			if (token === ']') {
				// Check if this is a longer link
				if (i+1 < tokens.length && tokens[i+1] === '(') {
					// This is a longer link, so itll get parsed later
					continue;
				}
			}

			// Search backwards through parse stack for beginning of link
			let match = rfind(stack, '[');

			if (match !== -1) {
				if (match !== 0 && stack[match-1] === '!') {
					// This is an image
					continue;
				}

				let link = parseResource(stack.slice(match));

				if (link === null || (link.src === null) && link.alt === null) {
					// Not a valid link
					continue;
				}

				let linkHtml = `<a href="${link.src ? link.src : link.alt}" title="${link.title ?? (link.src ?? link.alt)}">${link.alt}</a>`;
				stack.splice(match, link.offset+1, linkHtml);

			}
		} else {
			stack.push(token);
		}
	}

	return stack;
}

/*
 * Parses markdown, returning HTML
 *
 * tokens	The tokens to parse
 * Returns an HTML string
 */
function parseMarkdown(tokens) {
	let stack = [];

	/*
	 * Find last index of token containing a newline. Returns -1 if no match
	 * found.
	 */
	let rfind_lf = () => {
		for (let j=stack.length-1; j >= 0; --j) {
			if (stack[j].includes('\n')) {
				return j;
			}
		}
		return -1;
	};

	/*
	 * Reduce all elements in stack after and including index into one string
	 */
	let reduce_stack = (index) => {
		let reduced = stack.slice(index).join('');
		stack.splice(index, stack.length, reduced);
	};

	for (let i=0; i < tokens.length; ++i) {
		let token = tokens[i];

		if (token.startsWith('\n')) {
			// Handle block elements

			if (stack.length === 0) continue;  // Ignore this token

			let lineEnd = rfind_lf();  // Find index of last line ending
			let firstTokenIndex = null;

			// lineEnd can never be last element, so +1 is always valid
			for (let j=lineEnd+1; j < stack.length; ++j) {
				if (!stack[j].split('').every(c => " \t".includes(c))) {
					firstTokenIndex = j;
					break;
				}
			}

			firstToken = stack[firstTokenIndex];
			if (firstToken === null || firstToken === undefined) continue;  // Ignore this token

			if (firstToken.startsWith("#")) {
				/* Headings */
				let level = (firstToken.length <= 6) ? firstToken.length : 6;
				stack[firstTokenIndex] = `<h${level}>`;
				stack.push(`</h${level}>`);

				let inline = parseInlineMarkdown(stack.slice(firstTokenIndex));
				stack.splice(firstTokenIndex, stack.length, ...inline);
				reduce_stack(lineEnd+1);
			} else if (firstToken === '!') {
				/* Images */
				// '!', '[', ..., ']', '(', ..., ')'
				if (stack.length - lineEnd < 5) continue;  // Not a valid image

				let img = parseResource(stack.slice(firstTokenIndex + 1));

				if (img.src === null || img.alt === null) {
					// Not a valid image
					continue;
				}

				let imgHtml = `<img src="${img.src}" alt="${img.alt}" title="${img.title ?? img.alt}" />`;
				stack.splice(firstTokenIndex, img.offset+2, imgHtml);  // offset+2 since we've processed the \n and ! out here
			} else if (firstToken === '>') {

			} else if (lineEnd !== -1 && token.length === 1 && i+1 !== tokens.length) {
				// Single newline inside a paragraph; ignore
				stack.push(' ');
				continue;
			} else {
				/* Paragraphs */
				stack.splice(firstTokenIndex, 0, "<p>");
				stack.push("</p>");

				let inline = parseInlineMarkdown(stack.slice(firstTokenIndex));
				stack.splice(firstTokenIndex, stack.length, ...inline);
				reduce_stack(firstTokenIndex);
			}

			stack.push('\n');
		} else {
			stack.push(token);
		}
	}

	return stack.join('');
}

document.addEventListener("DOMContentLoaded", async () => {
	// Render markdown after DOM finished parsing
	let targetDivs = document.getElementsByClassName("markdown");

	for (const target of targetDivs) {
		if (!target instanceof HTMLElement) continue;  // Not an HTML element; ignore it

		let markdown;

		if ("src" in target.dataset) {
			// Source specified; load remote file
			markdown = await fetch(target.dataset.src).then(response => response.text());
		} else {
			// No source; use innerHTML
			markdown = target.innerHTML;
		}

		let tokens = tokenizeMarkdown(markdown);
		target.innerHTML = parseMarkdown(tokens);
	}
});
