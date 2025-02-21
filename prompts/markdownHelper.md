Using this as a guild please update my markdownstyles. give me back all of the code fo r the styles and change nothing else about my code:

Syntax Support

Headings
Horizontal Rules
Emphasis
Blockquotes
Lists
Code
Tables
Links
Images
Typographic Replacements
Plugins and Extensions
All Markdown for Testing
Rules and Styles

How to style stuff

Text styles are applied in a way that makes it much more convenient to manage changes to global styles while also allowing fine tuning of individual elements.

Think of the implementation like applying styles in CSS. changes to the body effect everything, but can be overwritten further down the style / component tree.

Be careful when styling 'text': the text rule is not applied to all rendered text, most notably list bullet points. If you want to, for instance, color all text, change the body style.

Example
Styles

Styles are used to override how certain rules are styled. The existing implementation is here

NOTE: By default styles are merged with the existing implementation, to change this, see the mergeStyle prop

Example Implementation
Rules

Rules are used to specify how you want certain elements to be displayed. The existing implementation is here

Example Implementation
All rules and their associated styles:

Render Rule	Style(s)
body	body
heading1	heading1
heading2	heading2
heading3	heading3
heading4	heading4
heading5	heading5
heading6	heading6
hr	hr
strong	strong
em	em
s	s
blockquote	blockquote
bullet_list	bullet_list
ordered_list	ordered_list
list_item	list_item - This is a special case that contains a set of pseudo classes that don't align to the render rule: ordered_list_icon, ordered_list_content, bullet_list_icon, bullet_list_content
code_inline	code_inline
code_block	code_block
fence	fence
table	table
thead	thead
tbody	tbody
th	th
tr	tr
td	td
link	link
blocklink	blocklink
image	image
text	text
textgroup	textgroup
paragraph	paragraph
hardbreak	hardbreak
softbreak	softbreak
pre	pre
inline	inline
span	span

