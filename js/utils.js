/*
 * Makes a bootstrap carousel
 */
function makeBSCarousel(container, items) {
    const carouselID = `carousel${Math.random().toString(36).substr(2)}`

    /* Create skeleton first */
    // Create carousel container
    const carousel = document.createElement("div");
    carousel.id = carouselID;
    carousel.classList.add("carousel", "slide");
    carousel.bsInterval = false;
    container.appendChild(carousel);

    // Create indicator container
    const indicators = document.createElement("ol");
    indicators.classList.add("carousel-indicators");
    carousel.appendChild(indicators);

    // Create carousel container
    const inner = document.createElement("div");
    inner.classList.add("carousel-inner");
    carousel.appendChild(inner);

    // Create carousel buttons
    for (const btn of ["prev", "next"]) {
        const elem = document.createElement("a");
        elem.classList.add(`carousel-control-${btn}`);
        elem.href = `#${carouselID}`;
        elem.role = "button";
        elem.dataset.bsSlide = btn;
        carousel.appendChild(elem);

        // Icon
        const icon = document.createElement("span");
        icon.classList.add(`carousel-control-${btn}-icon`);
        icon.ariaHidden = true;
        elem.appendChild(icon);

        // Label
        const label = document.createElement("span");
        label.classList.add("visually-hidden");
        label.innerText = btn;
        elem.appendChild(label);
    }

    // Populate carousel
    for (let i=0; i < items.length; ++i) {
        // Add indicator
        const indicator = document.createElement("li");
        indicator.dataset.bsTarget = carouselID;
        indicator.dataset.bsSlideTo = i;
        indicators.appendChild(indicator);

        // Add item
        const item = document.createElement("div");
        item.classList.add("carousel-item");
        inner.appendChild(item);

        // Add content
        item.appendChild(items[i]);

        if (i === 0) {
            indicator.classList.add("active");
            item.classList.add("active");
        }
    }
}
