/**
 * @fileOverview Data structure for countries, states, and cities.
 * This can be expanded or replaced with an API call in the future.
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
      "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville"],
      "Texas": ["Houston", "Austin", "Dallas", "San Antonio"],
      "California": ["Los Angeles", "San Francisco", "San Diego", "Sacramento"],
      "New York": ["New York City", "Buffalo", "Albany"],
      "Illinois": ["Chicago", "Springfield"],
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
  "Brazil": {
    states: {
      "Sao Paulo": ["Sao Paulo", "Campinas", "Santos"],
      "Rio de Janeiro": ["Rio de Janeiro", "Niteroi"],
      "Minas Gerais": ["Belo Horizonte"],
      "Parana": ["Curitiba"],
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

export const COUNTRIES = Object.keys(LOCATION_DATA).sort();
