const DATA_URL = "./data/airbnb_sf_listings_500.json";
const FALLBACK_IMG = "./images/photo-missing.svg";
const COUNT = 50;
const BUCKETS = 10;
const CLIP = 220;
const CHIPS = 6;
const MAX_COMPARE = 3;

const listingsEl = document.querySelector("#listings");
const searchEl = document.querySelector("#search");
const sortEl = document.querySelector("#sort");
const countEl = document.querySelector("#count");
const histEl = document.querySelector("#histogram");
const compareEl = document.querySelector("#compareBar");
const compareItemsEl = document.querySelector("#compareItems");

let listings = [];
let range = null;
const compared = new Map();

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const img = (src, alt, className) => {
  const node = el("img", className);
  node.src = src;
  node.alt = alt;
  node.loading = "lazy";
  node.addEventListener(
    "error",
    () => {
      node.src = FALLBACK_IMG;
    },
    { once: true },
  );
  return node;
};

const priceOf = (listing) => Number(String(listing.price).replace(/[$,]/g, ""));

const money = (value) => "$" + value.toFixed(0);

const plainText = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const amenitiesOf = (listing) => {
  try {
    return JSON.parse(listing.amenities);
  } catch {
    return [];
  }
};

// Card
const buildDescription = (listing) => {
  const full = plainText(listing.description);
  const short = full.length > CLIP ? full.slice(0, CLIP).trim() + "..." : full;
  const wrap = el("div", "description");
  const text = el("p", "description-text", short);
  wrap.append(text);
  if (full.length > CLIP) {
    const toggle = el("button", "link", "More");
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      const open = toggle.textContent === "More";
      text.textContent = open ? full : short;
      toggle.textContent = open ? "Less" : "More";
    });
    wrap.append(toggle);
  }
  return wrap;
};

const buildAmenities = (listing) => {
  const all = amenitiesOf(listing);
  const list = el("ul", "amenities");
  all.slice(0, CHIPS).forEach((name) => list.append(el("li", "chip", name)));
  const rest = all.slice(CHIPS);
  if (rest.length > 0) {
    const item = el("li");
    const more = el("button", "chip chip-more", "+" + rest.length + " more");
    more.type = "button";
    more.addEventListener("click", () => {
      item.remove();
      rest.forEach((name) => list.append(el("li", "chip", name)));
    });
    item.append(more);
    list.append(item);
  }
  return list;
};

const buildHost = (listing) => {
  const row = el("div", "host");
  row.append(
    img(listing.host_thumbnail_url, "Host " + listing.host_name, "host-photo"),
  );
  row.append(el("span", "host-name", listing.host_name));
  if (listing.host_is_superhost === "t") {
    row.append(el("span", "badge", "Superhost"));
  }
  return row;
};

const buildCompare = (listing) => {
  const label = el("label", "compare-toggle");
  const box = el("input");
  box.type = "checkbox";
  box.checked = compared.has(listing.id);
  box.addEventListener("change", () => {
    if (box.checked && compared.size >= MAX_COMPARE) {
      box.checked = false;
      return;
    }
    if (box.checked) {
      compared.set(listing.id, listing);
    } else {
      compared.delete(listing.id);
    }
    renderCompare();
  });
  label.append(box, el("span", undefined, "Compare"));
  return label;
};

const buildCard = (listing) => {
  const card = el("article", "listing");
  card.append(img(listing.picture_url, "Photo of " + listing.name, "photo"));
  const body = el("div", "body");
  const title = el("h2", "title");
  const link = el("a", undefined, listing.name);
  link.href = listing.listing_url;
  link.target = "_blank";
  link.rel = "noopener";
  title.append(link);
  body.append(title);
  body.append(el("p", "price", listing.price + " per night"));
  body.append(
    el(
      "p",
      "rating",
      listing.review_scores_rating +
        " from " +
        listing.number_of_reviews +
        " reviews, " +
        listing.neighbourhood_cleansed,
    ),
  );
  body.append(buildHost(listing));
  body.append(buildDescription(listing));
  body.append(buildAmenities(listing));
  body.append(buildCompare(listing));
  card.append(body);
  return card;
};

// Compare bar
const renderCompare = () => {
  compareEl.classList.toggle("is-empty", compared.size === 0);
  compareEl.querySelector("h2").textContent =
    compared.size >= MAX_COMPARE ? "Compare, 3 of 3 selected" : "Compare";
  const cards = [...compared.values()].map((listing) => {
    const box = el("div", "compare-card");
    box.append(el("p", "compare-name", listing.name));
    box.append(el("p", undefined, listing.price + " per night"));
    box.append(el("p", undefined, listing.review_scores_rating + " rating"));
    box.append(
      el(
        "p",
        undefined,
        listing.beds +
          (listing.beds === 1 ? " bed, " : " beds, ") +
          listing.bathrooms_text +
          ", sleeps " +
          listing.accommodates,
      ),
    );
    box.append(el("p", undefined, "Host " + listing.host_name));
    return box;
  });
  compareItemsEl.replaceChildren(...cards);
};

// Histogram
const buildHistogram = () => {
  const prices = listings.map(priceOf).sort((a, b) => a - b);
  const min = prices[0];
  const max = prices[prices.length - 1];
  const top = prices[Math.floor(prices.length * 0.9)];
  const width = (top - min) / BUCKETS;
  const counts = new Array(BUCKETS).fill(0);
  prices.forEach((price) => {
    const index = Math.min(BUCKETS - 1, Math.floor((price - min) / width));
    counts[index] += 1;
  });
  const tallest = Math.max(...counts);
  const bars = counts.map((count, index) => {
    const low = min + index * width;
    const high = index === BUCKETS - 1 ? max : low + width;
    const bar = el("button", "bucket");
    bar.type = "button";
    bar.title = money(low) + " to " + money(high) + ", " + count + " listings";
    bar.style.setProperty("--fill", (count / tallest) * 100 + "%");
    bar.append(el("span", "bar"));
    const label = index === BUCKETS - 1 ? money(low) + "+" : money(low);
    bar.append(el("span", "bucket-label", label));
    const active = range !== null && range[0] === low && range[1] === high;
    bar.setAttribute("aria-pressed", String(active));
    bar.addEventListener("click", () => {
      range = active ? null : [low, high];
      buildHistogram();
      render();
    });
    return bar;
  });
  histEl.replaceChildren(...bars);
};

// Filter, sort, render
const sortRows = (rows) => {
  const mode = sortEl.value;
  if (mode === "price-asc")
    return [...rows].sort((a, b) => priceOf(a) - priceOf(b));
  if (mode === "price-desc")
    return [...rows].sort((a, b) => priceOf(b) - priceOf(a));
  if (mode === "rating")
    return [...rows].sort(
      (a, b) => b.review_scores_rating - a.review_scores_rating,
    );
  return rows;
};

const render = () => {
  const query = searchEl.value.trim().toLowerCase();
  let rows = listings.filter((listing) =>
    (listing.name + " " + listing.neighbourhood_cleansed)
      .toLowerCase()
      .includes(query),
  );
  if (range !== null) {
    rows = rows.filter(
      (listing) => priceOf(listing) >= range[0] && priceOf(listing) <= range[1],
    );
  }
  rows = sortRows(rows);
  listingsEl.replaceChildren(...rows.map(buildCard));
  if (rows.length === 0) {
    listingsEl.append(
      el(
        "p",
        "error",
        "No listings match. Clear the search or the price filter.",
      ),
    );
  }
  countEl.textContent = "Showing " + rows.length + " of " + listings.length;
};

const loadListings = async () => {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error("Request failed with status " + res.status);
  }
  const data = await res.json();
  return data.slice(0, COUNT);
};

const start = async () => {
  try {
    listings = await loadListings();
    buildHistogram();
    render();
  } catch (error) {
    countEl.textContent = "Showing 0 of 0";
    listingsEl.replaceChildren(
      el("p", "error", "Could not load listings. " + error.message),
    );
  }
};

searchEl.addEventListener("input", render);
sortEl.addEventListener("change", render);
document.querySelector("#compareClear").addEventListener("click", () => {
  compared.clear();
  renderCompare();
  render();
});

start();
