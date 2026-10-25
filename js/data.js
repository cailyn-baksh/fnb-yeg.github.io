var sitedata = null;

/*
 * Loads site data
 */
async function getSiteData() {
    const response = await fetch("/data.json");

    if (response.ok) {
        sitedata = await response.json();
    } else {
        console.error(`getSiteData: Failed with code ${response.status}: ${response.statusText}`);
    }

    //const loadEvent = new CustomEvent("loadSiteData");
}

/*
 * Query a sitedata value from a key path
 *
 * path     A string containing one or more keys separated by dots
 * Returns the queried value, or null
 */
function querySiteData(path) {
    let keys = path.split('.');

    if (keys.length == 0) return null;

    let selected = sitedata;
    for (key of keys) {
        selected = selected[key];
    }

    return selected;
}

/*
 * Applies site data to data driven elements
 *
 * A data driven element is any element with the class data-driven
 * Data driven elements must have two properties: a key and a target
 * The key is defined by the data-key attribute. This is the key used to query
 * the sitedata object.
 * The target is defined by the data-target attribute. This is the element
 * attribute which the queried data will be written to.
 */
function applySiteData() {
    const elems = document.getElementsByClassName("data-driven");

    for (elem of elems) {
        let key = elem.dataset.key;
        let target = elem.dataset.target;

        elem[target] = querySiteData(key);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const elems = document.querySelectorAll("link.data-driven");

    for (elem of elems) {
        let data = await fetch(elem.href);
        console.log(await data.json());
    }
});

getSiteData();




// Start loading data
// Wait for DOM content to load
// Wait for data to finish loading
// Apply data to DOM

