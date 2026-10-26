# Experimental Data Driven Interface

Experimental interface to allow site content to be dynamically populated from
data files elsewhere on the server.

## Features

- Core sitedata
  - Lives in `/sitedata.json`. This data is always loaded first on every page.
  - This file would contain critical data which may need to be updated
    urgently. This file is in the root directory so it can easily be edited
    from the github web interface.
- Additional data
  - Can be added to specific pages using a `<link>` element
  - Can also be added to a page using a URL query. This enables a single page
    to be populated with different data based on the URL
- Content loading
  - Arbitrary content can be loaded using a `<link>` element.
  - Non-text MIME types are encoded as `blob:` URLs and can be used in `src`
    attributes in multimedia elements. I am not entirely sure what purpose this
    serves but it does work.
- Data driven elements
  - Elements can specify attributes which will be populated using the sitedata
  - Both data and content can be used to populate element attributes

### Loading Content & Data via `<link>`

A data or content source may be loaded using a `<link>` element with the
`data-include` attribute. This attribute may be either `content` or `data`.

Content elements require a `title` attribute to assign a name to the content.
They also may have an optional `type` attribute to specify the MIME type of the
content. `text/plain` is the default if no type is specified. Non-text data is
encoded as a `blob:` URL.

```html
<!-- Simplest way to include data -->
<link data-include="data" href="source.json" />

<!-- Same as above, but fetches the data while the page is still loading -->
<link data-include="data" rel="preload" as="fetch" href="source.json" />

<!-- Arbitrary content may also be included. The title attribute is required
for content. The content may be accessed with an @ symbol before the content title.-->
<link data-include="content" type="text/plain" title="foo" href="content.txt" />
```

`<link>` data is loaded second, after `sitedata.json`, so default sitedata can
be overridden on a per-page basis.

### Loading Data via URL queries

Data sources can be loaded by including a `ds` key in the URL query string. For
example, `/page?ds=source` would load the data file `/data/source.json`.

URL data sources are loaded third, allowing data on the same page to be
overridden depending on what URL query string is used to access the page.

Content cannot be loaded using URL queries.

### Data Driven Elements

Elements with the `data-driven` attribute will be populated using the specified
data. The attribute's value is a list of `attr=key` pairs, where `attr` is the
name of an attribute of the HTML element, and key is a valid data or content key.

Data keys are one or more names separated with a `.`. Each `.` queries the next
name, treating the previous name as an object. Arrays are currently unsupported;
this needs to be implemented.

Content keys are a single name prefixed with an `@`. The name is defined by the
`<link>` title attribute.

```html
<!-- This will populate the href attribute with the value of the url key -->
<a data-driven="href=url">Foo</a>

<!-- This will populate the innerHTML of the element with content loaded under the
name foo -->
<p data-driven="innerHTML=@foo"></p>
```

## Roadmap

[x] Load core sitedata file
[x] Populate data-driven values from sitedata
[x] `<link>` loading
  [x] Data files
  [x] Content files
[x] Load data files from URL query string
[ ] Dispatch document events as data is loaded and populated
  [ ] Delay markdown rendering until data population is complete
[ ] Allow included content to access data-driven values using page-specific data
[ ] Add syntax for indexing arrays from site data
[ ] Add defined failure behaviour & error handling

