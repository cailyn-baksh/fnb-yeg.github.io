var sitedata = {
    core: {}
};

document.addEventListener("DOMContentLoaded", async () => {
    /* Load core site data */
    sitedata.core = await fetch("/data.json").then((r) => r.json());

    /* Load additional sources */
    // <link> sources
    const linked = document.querySelectorAll("link.data-source");
    for (let link of linked) {
        sitedata[link.dataset.ns] = await fetch(link.href).then((r) => r.json());
    }

    /* GET sources */
    let urlSources = new URLSearchParams(window.location.search)
        .get("ds").split(' ');

    for (let source of urlSources) {
        sitedata[source] = await fetch(`/data/${source}.json`).then((r) => r.json());
    }

    // Load arbitrary content
    // Populate data-driven targets
});

