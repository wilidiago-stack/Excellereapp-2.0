/**
 * @fileOverview Data structure for countries, states, and cities.
 * Includes all 50 US States + Puerto Rico and alphabetical sorting logic.
 */

export interface LocationData {
  [country: string]: {
    states: {
      [state: string]: string[];
    };
  };
}

export const LOCATION_DATA: LocationData = {
  "United States": {
    states: {
      "Alabama": ["Birmingham", "Montgomery", "Mobile", "Huntsville"],
      "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Sitka"],
      "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler"],
      "Arkansas": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale"],
      "California": ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"],
      "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins"],
      "Connecticut": ["Bridgeport", "New Haven", "Stamford", "Hartford"],
      "Delaware": ["Wilmington", "Dover", "Newark", "Middletown"],
      "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee"],
      "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah"],
      "Hawaii": ["Honolulu", "Hilo", "Kailua", "Kapolei"],
      "Idaho": ["Boise", "Meridian", "Nampa", "Idaho Falls"],
      "Illinois": ["Chicago", "Aurora", "Rockford", "Joliet", "Springfield"],
      "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend"],
      "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City"],
      "Kansas": ["Wichita", "Overland Park", "Kansas City", "Topeka"],
      "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Owensboro"],
      "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette"],
      "Maine": ["Portland", "Lewiston", "Bangor", "South Portland"],
      "Maryland": ["Baltimore", "Columbia", "Germantown", "Silver Spring"],
      "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge"],
      "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights"],
      "Minnesota": ["Minneapolis", "Saint Paul", "Rochester", "Duluth"],
      "Mississippi": ["Jackson", "Gulfport", "Southaven", "Biloxi"],
      "Missouri": ["Kansas City", "Saint Louis", "Springfield", "Columbia"],
      "Montana": ["Billings", "Missoula", "Great Falls", "Bozeman"],
      "Nebraska": ["Omaha", "Lincoln", "Bellevue", "Grand Island"],
      "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas"],
      "New Hampshire": ["Manchester", "Nashua", "Concord", "Derry"],
      "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth"],
      "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe"],
      "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Albany"],
      "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham"],
      "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot"],
      "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo"],
      "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow"],
      "Oregon": ["Portland", "Salem", "Eugene", "Gresham"],
      "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie"],
      "Puerto Rico": ["San Juan", "Bayamón", "Carolina", "Ponce", "Caguas", "Guaynabo"],
      "Rhode Island": ["Providence", "Warwick", "Cranston", "Pawtucket"],
      "South Carolina": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant"],
      "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings"],
      "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga"],
      "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth"],
      "Utah": ["Slc", "West Valley City", "Provo", "West Jordan"],
      "Vermont": ["Burlington", "South Burlington", "Rutland", "Barre"],
      "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond"],
      "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver"],
      "West Virginia": ["Charleston", "Huntington", "Morgantown", "Parkersburg"],
      "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha"],
      "Wyoming": ["Cheyenne", "Casper", "Laramie", "Gillette"]
    }
  },
  "Mexico": {
    states: {
      "Jalisco": ["Guadalajara", "Puerto Vallarta", "Zapopan"],
      "Ciudad de Mexico": ["Mexico City"],
      "Nuevo Leon": ["Monterrey", "San Pedro Garza Garcia"],
      "Quintana Roo": ["Cancun", "Playa del Carmen", "Tulum"],
      "Yucatan": ["Merida"],
    }
  },
  "Colombia": {
    states: {
      "Antioquia": ["Medellin", "Envigado", "Itagui"],
      "Cundinamarca": ["Bogota", "Soacha"],
      "Valle del Cauca": ["Cali", "Palmira"],
      "Atlantico": ["Barranquilla"],
      "Bolivar": ["Cartagena"],
    }
  },
  "Spain": {
    states: {
      "Madrid": ["Madrid", "Alcala de Henares"],
      "Catalonia": ["Barcelona", "Girona", "Tarragona"],
      "Andalusia": ["Seville", "Malaga", "Granada"],
      "Valencia": ["Valencia", "Alicante"],
    }
  },
  "Canada": {
    states: {
      "Ontario": ["Toronto", "Ottawa", "Mississauga"],
      "Quebec": ["Montreal", "Quebec City"],
      "British Columbia": ["Vancouver", "Victoria"],
      "Alberta": ["Calgary", "Edmonton"],
    }
  },
  "Argentina": {
    states: {
      "Buenos Aires": ["Buenos Aires City", "La Plata", "Mar del Plata"],
      "Cordoba": ["Cordoba City"],
      "Santa Fe": ["Rosario"],
    }
  }
};

// Logic to pin United States at the top
const rawCountries = Object.keys(LOCATION_DATA).sort();
const pinnedCountry = "United States";
export const COUNTRIES = [pinnedCountry, ...rawCountries.filter(c => c !== pinnedCountry)];
