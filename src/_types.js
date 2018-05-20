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

export type ParsedFile = {
	fileName: string;
	mimeType: string;
	base64Data: string;
};

export type Checkin = {
	clientKey: string;
	placeId: number;
	dateTime: string; // ISO8601
	location: Location|null;
	photo: ParsedFile;
};
