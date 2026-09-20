// One Overpass tag filter per activity type. A single clause keeps the public
// server's response time around two seconds; unions of clauses were much slower.
export const TAG_FILTER_BY_TYPE = {
  sightseeing: '[tourism~"^(attraction|viewpoint|theme_park)$"]',
  culture: '[tourism~"^(museum|gallery)$"]',
  nature: '[natural~"^(waterfall|peak|beach|hot_spring)$"]',
  spiritual: '[amenity=place_of_worship][wikidata]',
  adventure: '[sport~"climbing|rafting|paragliding|skiing|scuba_diving"]',
  food: '[amenity~"^(restaurant|cafe)$"][cuisine][website]',
  shopping: '[amenity=marketplace]',
};

export const DEFAULT_FILTER = '[tourism~"^(attraction|viewpoint|theme_park|museum)$"]';

export function typeFromTags(tags, requestedType) {
  if (requestedType) return requestedType;
  if (tags.tourism === 'museum' || tags.historic) return 'culture';
  if (tags.tourism === 'theme_park') return 'adventure';
  if (tags.natural) return 'nature';
  return 'sightseeing';
}
