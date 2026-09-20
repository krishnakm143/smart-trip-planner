/** Title given to a trip when the traveller does not enter one, e.g. "4 days in Manali". */
export const defaultTitle = (days, destinationName) =>
  `${days} ${days === 1 ? 'day' : 'days'} in ${destinationName}`;
