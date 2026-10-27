/*
 * Triggered when site data is loaded
 *
 * origin       The thing that requested the data load. The core sitedata load
 *              has the origin 'SITEDATA'. URL query loads have the origin
 *              'URL'. HTML sources specify their node object.
 * source       The path of the data source that was loaded
 * type         The type of data loaded; either 'data' or 'content'
 */
class SiteDataLoadEvent extends Event {
    #origin;
    #source;
    #type;

    constructor(origin, source, type) {
        super("sitedata-load");

        this.#origin = origin;
        this.#source = source;
        this.#type = type;
    }

    get origin() {
        return this.#origin;
    }

    get source() {
        return this.#source;
    }

    get type() {
        return this.#type;
    }
}

/*
 * Triggered when site data is populated
 *
 * element      The affected element
 * attribute    The attribute that was populated
 * key          The sitedata key that was queried
 * value        The value that was populated
 */
class SiteDataPopulateEvent extends Event {
    #element;
    #attribute;
    #key;
    #value;

    constructor(elem, attr, key, value) {
        super("sitedata-populate");

        this.#element = elem;
        this.#attribute = attr;
        this.#key = key;
        this.#value = value;
    }

    get element() {
        return this.#element;
    }

    get attribute() {
        return this.#attribute;
    }

    get key() {
        return this.#key;
    }

    get value() {
        return this.#value;
    }
}

class SiteData {
    #data = {};
    #content = {};

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

        // What to return? Promise? SiteDataLoadEvent?
    }

    /*
     * Load arbitrary content
     * src      The source to load the content from
     * title    The content title, used to access the content
     * mime     The MIME type of the content. Defaults to text/plain
     * opts     Options to pass to fetch. Defaults to a same-origin request.
     */
    async loadContent(src, title, mime="text/plain",
                      opts={mode:"no-cors",credentials:"include"}) {
        // We only care about the discrete type
        let [type, subtype] = mime.split('/', 2);

        let content = await fetch(src, opts).then(r => r.blob());

        switch (type) {
            case "text":
                content = await content.text();

                if (subtype === "html"
                    || subtype === "xml"
                    || subtype === "svg"
                ) {
                    // Parse document
                    let doc = new DOMParser().parseFromString(content, mime);
                    // Populate data
                    this.populateDocument(doc);
                    // Extract original document. This may cause some kind of
                    // problems but it seems to work so far
                    content = doc.body.innerHTML;
                }

                this.#content[title] = content;
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

    /*
     * Populate a Document with data-driven values
     */
    populateDocument(doc) {
        // Get all data-driven elements
        const elems = doc.querySelectorAll("[data-driven]");

        for (const elem of elems) {
            // Get all data targets within this element
            let targets = elem.dataset.driven.split(';');

            // Query and apply each data target
            for (const target of targets) {
                let [attr, key] = target.split('=');
                let value = sitedata.query(key);
                elem[attr] = value;

                // Should this be done to document or doc?
                document.dispatchEvent(new SiteDataPopulateEvent(elem, attr, key, value));
            }
        }
    }
}


function populateDataDrivenElement(elem) {
    // Get all data targets
    let targets = elem.dataset.driven.split(';');

    // Query and apply each data target
    for (const target of targets) {
        let [attr, key] = target.split('=');
        let value = sitedata.query(key);
        elem[attr] = value;

        document.dispatchEvent(new SiteDataPopulateEvent(elem, attr, key, value));
    }
}


const SITEDATA_PATH = "/sitedata.json";
var sitedata = new SiteData();

// Debug/testing listeners
/*document.addEventListener("sitedata-load", (e) => {
    console.log(e.origin, `loaded ${e.type} from '${e.source}'`);
});
document.addEventListener("sitedata-populate", (e) => {
    console.log(`Populated ${e.attribute} with '${e.value}' from key ${e.key}`, e.element);
});
document.addEventListener("sitedata-finish", () => console.log("Finished loading sitedata"));
*/

document.addEventListener("DOMContentLoaded", async () => {
    /* Load core site data */
    await sitedata.loadData(SITEDATA_PATH);
    document.dispatchEvent(new SiteDataLoadEvent("SITEDATA", SITEDATA_PATH, "data"));

    /* Load additional sources */

    // Get all <link> sources
    const linked = Array.from(document.querySelectorAll("link[data-include]"));

    // TODO: handle invalid include values

    // Sort data sources before content sources
    // Is order between elements of the same type preserved? If not it may
    // affect content queries from within content, which is undefined behaviour
    // currently but if order can be guaranteed it may make it more flexible
    linked.sort((a,b) => {
        if (a.dataset.include === b.dataset.include) return 0;  // No change
        if (a.dataset.include === "data") return -1;  // a comes first
        return 1;  // b comes first
    });

    // Load linked data sources
    while (linked.length > 0 && linked[0].dataset.include === "data") {
        // Get next source to process
        const link = linked.shift();

        await sitedata.loadData(link.href);
        document.dispatchEvent(new SiteDataLoadEvent(link, link.href, "data"));
    }

    // Load URL query sources
    let urlSources = new URLSearchParams(window.location.search).get("ds");
    if (urlSources !== null) {
        urlSources = urlSources.split(' ');

        for (const source of urlSources) {
            let href = `/data/${source}.json`;
            await sitedata.loadData(href);
            document.dispatchEvent(new SiteDataLoadEvent("URL", href, "data"));
        }
    }

    // Load linked content sources
    while (linked.length > 0) {
        // Get next source to process
        const link = linked.shift();

        await sitedata.loadContent(link.href, link.title,
            link.hasAttribute("type") ? link.type : "text/plain");
        document.dispatchEvent(new SiteDataLoadEvent(link, link.href, "content"));
    }

    /* Populate data-driven targets */
    sitedata.populateDocument(document);

    document.dispatchEvent(new CustomEvent("sitedata-finish"));
});

