import geolib from 'geolib';
import { Location, Place } from './_types';

type SuggestedPlaceGroup = {
	name: string;
	places: Place[];
};

export default class Places {
	_geoPlaces: Place[];
	_utilityPlaces: Place[];

	constructor(places: Place[]) {
		this._geoPlaces = places.filter(p => p.location);
		this._utilityPlaces = places.filter(p => !p.location);
	}

	get geoPlaces() {
		return this._geoPlaces;
	}

	get utilityPlaces() {
		return this._utilityPlaces;
	}

	nearestPlaces(location: Location, count: number = 3): Place[] {
		const items = this._geoPlaces.map(p => ({
			place: p,
			distance: geolib.getDistance(p.location, location),
		}));

		items.sort((a, b) => a.distance - b.distance);

		return items.slice(0, count).map(i => i.place);
	}

	groupedPlaceSuggestions(location: Location|null): SuggestedPlaceGroup[] {
		const nearest = location ? this.nearestPlaces(location) : [];
		const nearestIds = nearest.map(p => p.id);
		const otherGeo = this._geoPlaces.filter(p => !nearestIds.includes(p.id));

		otherGeo.sort((a, b) => a.name - b.name);

		const output = [];

		if (nearest.length)
			output.push({ name: 'Nearest', places: nearest });

		if (this.utilityPlaces.length)
			output.push({ name: 'Utilities', places: this.utilityPlaces });

		if (otherGeo.length)
			output.push({ name: 'Others', places: otherGeo });

		return output;
	}
}
