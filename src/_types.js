export type Location = {
	latitude: number;
	longitude: number;
};

export type Category = {
	id: number;
	name: string;
	color: string; // hex
};

export type Place = {
	id: number;
	name: string;
	category: Category;
	location: Location|null;
};
