class SiteData {
    #data = {};

    constructor() {
    }

    get data() {
        return Object.freeze(this.#data);
    }

    toString() {
        return JSON.stringify(this.#data);
    }

    /*
     * Load site data from a source
     * src      The source to load the data from
     * opts     Options to pass to fetch()
     */
    async loadFromSource(src, opts={mode:"no-cors",credentials:"include"}) {
        let data = await fetch(src, opts).then((r) => r.json());
        this.#data = Object.assign(this.#data, data);
    }

    query(path) {
        let keys = path.split('.');

        let selected = this.#data;
        for (const key of keys) {
            selected = selected[key];
        }

        return selected;
    }
}

var sitedata = new SiteData();

document.addEventListener("DOMContentLoaded", async () => {
    /* Load core site data */
    await sitedata.loadFromSource("/data.json");

    /* Load additional sources */
    // <link> sources
    const linked = document.querySelectorAll("link.data-source");
    for (const link of linked) {
        await sitedata.loadFromSource(link.href);
    }

    /* GET sources */
    let urlSources = new URLSearchParams(window.location.search).get("ds");
    if (urlSources !== null) {
        urlSources = urlSources.split(' ');

        for (const source of urlSources) {
            await sitedata.loadFromSource(`/data/${source}.json`);
        }
    }

    /* Load arbitrary content */
    const includes = document.querySelectorAll("[data-include]");
    for (const include of includes) {
        let content = await fetch(include.dataset.src);

        switch (include.dataset.include) {
            case "blob":
                content = await content.blob();
                break;
            case "text":
            default:
                content = await content.text();
                break;
        }

        //console.log(content.bytes());
        include.innerHTML = content;
    }

    /* Populate data-driven targets */
    // Get add data-driven elements
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

