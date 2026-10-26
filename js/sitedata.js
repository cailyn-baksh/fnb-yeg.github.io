class SiteData {
    #data = {};
    #content = {};

    constructor() {
    }

    get data() {
        return Object.freeze(this.#data);
    }

    get content() {
        return Object.freeze(this.#content);
    }

    toString() {
        return JSON.stringify({ data: this.#data, content: this.#content});
    }

    /*
     * Load JSON site data
     * src      The source to load the data from
     * opts     Options to pass to fetch. Defaults to a same-origin request.
     */
    async loadData(src, opts={mode:"no-cors",credentials:"include"}) {
        let data = await fetch(src, opts).then(r => r.json());
        this.#data = Object.assign(this.#data, data);
    }

    /*
     * Load arbitrary content
     * src      The source to load the content from
     * title    The content title, used to access the content
     * type     The MIME type of the content. Defaults to text/plain
     * opts     Options to pass to fetch. Defaults to a same-origin request.
     */
    async loadContent(src, title, type="text/plain",
                      opts={mode:"no-cors",credentials:"include"}) {
        // We only care about the discrete type
        type = type.split('/')[0];

        let content = await fetch(src, opts).then(r => r.blob());

        switch (type) {
            case "text":
                this.#content[title] = await content.text();
                break;
            default:
                this.#content[title] = URL.createObjectURL(content);
        }
    }

    /*
     * Gets a value from the site data
     * path     The path to access.
     * Returns the value, or undefined if the value does not exist
     *
     * Paths may be one or more data keys, separated by '.', or a single
     * content key prefixed with an '@'.
     */
    query(path) {
        if (path[0] === '@') {
            // Get content
            return this.#content[path.substr(1)];
        } else {
            // Get data
            let keys = path.split('.');

            let selected = this.#data;
            for (const key of keys) {
                selected = selected[key];
            }

            return selected;
        }

    }
}

var sitedata = new SiteData();

document.addEventListener("DOMContentLoaded", async () => {
    /* Load core site data */
    await sitedata.loadData("/sitedata.json");

    /* Load additional sources */
    // <link> sources
    const linked = document.querySelectorAll("link[data-include]");
    for (const link of linked) {
        switch (link.dataset.include) {
            case "data":
                // Load JSON data
                await sitedata.loadData(link.href);
                break;
            case "content":
                // Load arbitrary content
                await sitedata.loadContent(link.href, link.title,
                    link.hasAttribute("type") ? link.type : "text/plain");
                break;
        }
    }

    // GET sources
    let urlSources = new URLSearchParams(window.location.search).get("ds");
    if (urlSources !== null) {
        urlSources = urlSources.split(' ');

        for (const source of urlSources) {
            await sitedata.loadData(`/data/${source}.json`);
        }
    }

    /* Populate data-driven targets */
    // Get add data-driven elements
    // TODO: Allow included content to access data values
    const elems = document.querySelectorAll("[data-driven]");
    for (const elem of elems) {
        // Get all data targets
        let targets = elem.dataset.driven.split(';');

        // Query and apply each data target
        for (const target of targets) {
            let [attr, key] = target.split('=');
            elem[attr] = sitedata.query(key);
        }
    }
});

