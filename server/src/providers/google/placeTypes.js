const TYPE_BY_GOOGLE_TYPE = {
  hindu_temple: 'spiritual',
  church: 'spiritual',
  mosque: 'spiritual',
  synagogue: 'spiritual',
  place_of_worship: 'spiritual',
  museum: 'culture',
  art_gallery: 'culture',
  historical_landmark: 'culture',
  historical_place: 'culture',
  cultural_landmark: 'culture',
  monument: 'culture',
  performing_arts_theater: 'culture',
  park: 'nature',
  national_park: 'nature',
  state_park: 'nature',
  garden: 'nature',
  botanical_garden: 'nature',
  wildlife_park: 'nature',
  wildlife_refuge: 'nature',
  beach: 'nature',
  zoo: 'nature',
  hiking_area: 'adventure',
  adventure_sports_center: 'adventure',
  amusement_park: 'adventure',
  water_park: 'adventure',
  ski_resort: 'adventure',
  restaurant: 'food',
  cafe: 'food',
  bakery: 'food',
  market: 'shopping',
  shopping_mall: 'shopping',
  gift_shop: 'shopping',
};

export const SEARCH_PHRASE_BY_TYPE = {
  sightseeing: 'tourist attractions',
  adventure: 'adventure activities',
  culture: 'museums and heritage sites',
  nature: 'parks, lakes and nature spots',
  spiritual: 'temples and places of worship',
  food: 'popular local restaurants and cafes',
  shopping: 'local markets and shopping streets',
};

export function mapGoogleTypes(googleTypes = [], fallbackType = 'sightseeing') {
  const match = googleTypes.find((googleType) => TYPE_BY_GOOGLE_TYPE[googleType]);
  return match ? TYPE_BY_GOOGLE_TYPE[match] : fallbackType;
}
