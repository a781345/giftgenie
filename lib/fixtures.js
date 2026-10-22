// Fixture catalog for MOCK MODE ONLY. Shapes follow real Qloo responses
// (entity_id, type, subtype(s), properties, popularity, query.affinity, tags[]).
// Restaurants and shops are fictional placeholders; real data comes from Qloo.

const tag = (type, slug, name) => ({ id: `urn:tag:${type}:${slug}`, name, type: `urn:tag:${type}`, value: `urn:tag:${type}:${slug}` });

const T = {
  // media genres
  comedy: tag("genre:media", "comedy", "Comedy"),
  romance: tag("genre:media", "romance", "Romance"),
  drama: tag("genre:media", "drama", "Drama"),
  scifi: tag("genre:media", "science_fiction", "Science Fiction"),
  fantasy: tag("genre:media", "fantasy", "Fantasy"),
  animation: tag("genre:media", "animation", "Animation"),
  mystery: tag("genre:media", "mystery", "Mystery"),
  feelgood: tag("keyword:media", "feel_good", "Feel-Good"),
  whimsical: tag("keyword:media", "whimsical", "Whimsical"),
  nostalgic: tag("keyword:media", "nostalgic", "Nostalgic"),
  indie: tag("keyword:media", "independent_film", "Independent Film"),
  coming: tag("keyword:media", "coming_of_age", "Coming of Age"),
  // music
  indiepop: tag("genre:music", "indie_pop", "Indie Pop"),
  dreampop: tag("genre:music", "dream_pop", "Dream Pop"),
  jazz: tag("genre:music", "jazz", "Jazz"),
  soul: tag("genre:music", "soul", "Soul"),
  citypop: tag("genre:music", "city_pop", "City Pop"),
  folk: tag("genre:music", "folk", "Folk"),
  // places
  restaurant: tag("category:place", "restaurant", "Restaurant"),
  italian: tag("genre:place:restaurant", "italian", "Italian"),
  japanese: tag("genre:place:restaurant", "japanese", "Japanese"),
  french: tag("genre:place:restaurant", "french", "French"),
  thai: tag("genre:place:restaurant", "thai", "Thai"),
  cantonese: tag("genre:place:restaurant", "cantonese", "Cantonese"),
  dessert: tag("genre:place:restaurant", "dessert", "Dessert"),
  romantic: tag("keyword:place", "romantic", "Romantic"),
  cozy: tag("keyword:place", "cozy", "Cozy"),
  views: tag("keyword:place", "great_view", "Great View"),
  vinyl: tag("keyword:place", "vinyl_records", "Vinyl Records"),
  // brands / lifestyle
  stationery: tag("keyword:brand", "stationery", "Stationery"),
  design: tag("keyword:brand", "design", "Design"),
  analog: tag("keyword:brand", "analog_photography", "Analog Photography"),
  candles: tag("keyword:brand", "home_fragrance", "Home Fragrance"),
  tea: tag("keyword:brand", "tea", "Tea"),
  outdoor: tag("keyword:brand", "outdoor", "Outdoor"),
};

let n = 0;
const id = () => {
  n += 1;
  const h = (n * 2654435761 >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `${h}-${h.slice(0, 4)}-4${h.slice(1, 4)}-A${h.slice(5, 8)}-${(h + h).slice(0, 12)}`;
};

const e = (subtype, name, popularity, tags, properties) => ({
  name,
  entity_id: id(),
  type: "urn:entity",
  subtype,
  properties,
  popularity,
  tags,
});

export const MOVIES = [
  e("urn:entity:movie", "Amélie", 0.982, [T.romance, T.comedy, T.whimsical, T.feelgood], { release_year: 2001, content_rating: "R", duration: 122, description: "A shy Parisian waitress decides to secretly orchestrate the lives of the people around her.", image: { url: "" } }),
  e("urn:entity:movie", "Spirited Away", 0.991, [T.animation, T.fantasy, T.whimsical, T.coming], { release_year: 2001, content_rating: "PG", duration: 125, description: "A girl wanders into a world ruled by gods, witches and spirits.", image: { url: "" } }),
  e("urn:entity:movie", "La La Land", 0.988, [T.romance, T.drama, T.nostalgic], { release_year: 2016, content_rating: "PG-13", duration: 128, description: "A jazz pianist and an aspiring actress fall in love in Los Angeles.", image: { url: "" } }),
  e("urn:entity:movie", "In the Mood for Love", 0.951, [T.romance, T.drama, T.nostalgic, T.indie], { release_year: 2000, content_rating: "PG", duration: 98, description: "Two neighbours in 1962 Hong Kong form a bond after suspecting their spouses of an affair.", image: { url: "" } }),
  e("urn:entity:movie", "The Grand Budapest Hotel", 0.985, [T.comedy, T.whimsical, T.mystery], { release_year: 2014, content_rating: "R", duration: 99, description: "A legendary concierge and his lobby boy get caught up in a theft and a fortune.", image: { url: "" } }),
  e("urn:entity:movie", "Before Sunrise", 0.957, [T.romance, T.drama, T.indie], { release_year: 1995, content_rating: "R", duration: 101, description: "Two strangers meet on a train and spend one night walking through Vienna.", image: { url: "" } }),
  e("urn:entity:movie", "Lost in Translation", 0.968, [T.drama, T.comedy, T.indie], { release_year: 2003, content_rating: "R", duration: 102, description: "A faded movie star and a young woman form a bond in Tokyo.", image: { url: "" } }),
  e("urn:entity:movie", "Paddington 2", 0.962, [T.comedy, T.feelgood, T.whimsical], { release_year: 2017, content_rating: "PG", duration: 103, description: "Paddington takes on odd jobs to buy the perfect present for his aunt.", image: { url: "" } }),
  e("urn:entity:movie", "Howl's Moving Castle", 0.976, [T.animation, T.fantasy, T.romance], { release_year: 2004, content_rating: "PG", duration: 119, description: "A young woman cursed with old age seeks out a wizard's walking castle.", image: { url: "" } }),
  e("urn:entity:movie", "Everything Everywhere All at Once", 0.979, [T.scifi, T.comedy, T.drama], { release_year: 2022, content_rating: "R", duration: 139, description: "A laundromat owner is swept into a multiverse adventure.", image: { url: "" } }),
  e("urn:entity:movie", "Past Lives", 0.944, [T.romance, T.drama, T.indie], { release_year: 2023, content_rating: "PG-13", duration: 106, description: "Childhood friends reunite decades later and confront what might have been.", image: { url: "" } }),
  e("urn:entity:movie", "Moonrise Kingdom", 0.949, [T.comedy, T.romance, T.coming, T.whimsical], { release_year: 2012, content_rating: "PG-13", duration: 94, description: "Two twelve-year-olds fall in love and run away together on a New England island.", image: { url: "" } }),
];

export const ARTISTS = [
  e("urn:entity:artist", "Taylor Swift", 0.999, [T.indiepop, T.folk], { short_description: "American singer-songwriter", image: { url: "" } }),
  e("urn:entity:artist", "Beach House", 0.912, [T.dreampop, T.indiepop], { short_description: "Baltimore dream pop duo", image: { url: "" } }),
  e("urn:entity:artist", "Norah Jones", 0.948, [T.jazz, T.soul], { short_description: "American singer and pianist", image: { url: "" } }),
  e("urn:entity:artist", "Mariya Takeuchi", 0.873, [T.citypop], { short_description: "Japanese city pop singer-songwriter", image: { url: "" } }),
  e("urn:entity:artist", "Phoebe Bridgers", 0.931, [T.indiepop, T.folk], { short_description: "American indie singer-songwriter", image: { url: "" } }),
  e("urn:entity:artist", "Joe Hisaishi", 0.902, [T.jazz], { short_description: "Japanese composer known for Studio Ghibli scores", image: { url: "" } }),
  e("urn:entity:artist", "Lana Del Rey", 0.981, [T.dreampop, T.indiepop], { short_description: "American singer-songwriter", image: { url: "" } }),
  e("urn:entity:artist", "Faye Wong", 0.884, [T.dreampop, T.citypop], { short_description: "Hong Kong-based Chinese singer", image: { url: "" } }),
  e("urn:entity:artist", "Laufey", 0.917, [T.jazz, T.indiepop], { short_description: "Icelandic jazz-pop singer", image: { url: "" } }),
];

export const BOOKS = [
  e("urn:entity:book", "Tomorrow, and Tomorrow, and Tomorrow", 0.958, [T.drama, T.coming], { publication_year: 2022, description: "Two friends build video games together over three decades.", image: { url: "" } }),
  e("urn:entity:book", "Norwegian Wood", 0.947, [T.romance, T.nostalgic, T.coming], { publication_year: 1987, description: "Haruki Murakami's nostalgic story of loss and first love in 1960s Tokyo.", image: { url: "" } }),
  e("urn:entity:book", "The Night Circus", 0.936, [T.fantasy, T.romance, T.whimsical], { publication_year: 2011, description: "A magical competition unfolds inside a circus that only opens at night.", image: { url: "" } }),
  e("urn:entity:book", "Before the Coffee Gets Cold", 0.912, [T.fantasy, T.feelgood], { publication_year: 2015, description: "A Tokyo café lets customers travel back in time, for as long as their coffee stays warm.", image: { url: "" } }),
  e("urn:entity:book", "Klara and the Sun", 0.921, [T.scifi, T.drama], { publication_year: 2021, description: "An artificial friend observes the family she has been bought to serve.", image: { url: "" } }),
  e("urn:entity:book", "The House in the Cerulean Sea", 0.927, [T.fantasy, T.feelgood, T.whimsical], { publication_year: 2020, description: "A caseworker visits an orphanage of magical children and finds a family.", image: { url: "" } }),
  e("urn:entity:book", "Normal People", 0.944, [T.romance, T.drama, T.coming], { publication_year: 2018, description: "Two Irish teenagers circle each other through school and university.", image: { url: "" } }),
  e("urn:entity:book", "The Little Prince", 0.989, [T.fantasy, T.whimsical, T.nostalgic], { publication_year: 1943, description: "A pilot meets a young prince who has travelled from a tiny asteroid.", image: { url: "" } }),
];

export const BRANDS = [
  e("urn:entity:brand", "Studio Ghibli Museum Shop", 0.872, [T.design, T.whimsical, T.nostalgic], { short_description: "Official Ghibli merchandise and art books", image: { url: "" } }),
  e("urn:entity:brand", "Moleskine", 0.934, [T.stationery, T.design], { short_description: "Notebooks and journals", image: { url: "" } }),
  e("urn:entity:brand", "Instax", 0.951, [T.analog, T.design, T.nostalgic], { short_description: "Instant cameras and film by Fujifilm", image: { url: "" } }),
  e("urn:entity:brand", "Diptyque", 0.903, [T.candles, T.design], { short_description: "Parisian candles and fragrance", image: { url: "" } }),
  e("urn:entity:brand", "Le Labo", 0.896, [T.candles], { short_description: "Hand-blended fragrances", image: { url: "" } }),
  e("urn:entity:brand", "Mariage Frères", 0.861, [T.tea, T.design], { short_description: "French tea house since 1854", image: { url: "" } }),
  e("urn:entity:brand", "Kinokuniya", 0.888, [T.stationery], { short_description: "Japanese bookstore chain", image: { url: "" } }),
  e("urn:entity:brand", "Audio-Technica", 0.914, [T.vinyl, T.design], { short_description: "Turntables and headphones", image: { url: "" } }),
  e("urn:entity:brand", "Patagonia", 0.957, [T.outdoor], { short_description: "Outdoor clothing and gear", image: { url: "" } }),
];

// Restaurants: `{city}` is replaced with the requested city in mock mode.
const r = (name, cuisine, kw, price, rating, desc) =>
  e("urn:entity:place", name, 0.6 + (name.length % 30) / 100, [T.restaurant, cuisine, ...kw], {
    address: `{city}`,
    business_rating: rating,
    price_level: price,
    short_description: desc,
    keywords: kw.map((k, i) => ({ name: k.name.toLowerCase(), count: 120 - i * 30 })),
    website: "",
    image: { url: "" },
  });

export const RESTAURANTS = [
  r("Trattoria Luna (mock)", T.italian, [T.romantic, T.cozy], 3, 4.6, "Candle-lit handmade pasta and natural wine"),
  r("Kissa Hoshi (mock)", T.japanese, [T.cozy, T.vinyl], 2, 4.7, "Listening-bar café with a vinyl wall and hand-drip coffee"),
  r("Le Petit Moulin (mock)", T.french, [T.romantic, T.views], 4, 4.5, "Bistro classics with a rooftop terrace"),
  r("Omakase Ren (mock)", T.japanese, [T.romantic], 4, 4.8, "Twelve-seat omakase counter"),
  r("Golden Lotus Dim Sum (mock)", T.cantonese, [T.cozy], 2, 4.4, "All-day dim sum and egg tarts"),
  r("Baan Siam (mock)", T.thai, [T.cozy], 2, 4.5, "Northern Thai home cooking"),
  r("Sugar & Spoon (mock)", T.dessert, [T.cozy, T.whimsical], 1, 4.6, "Soufflé pancakes and seasonal parfaits"),
  r("Skyline Wine Bar (mock)", T.french, [T.views, T.romantic], 3, 4.4, "Small plates with a harbour view"),
  r("Nonna's Table (mock)", T.italian, [T.cozy], 2, 4.3, "Family-style Roman trattoria"),
];

export const ALL = { "urn:entity:movie": MOVIES, "urn:entity:artist": ARTISTS, "urn:entity:book": BOOKS, "urn:entity:brand": BRANDS, "urn:entity:place": RESTAURANTS };
export const ALL_TAGS = Object.values(T);
