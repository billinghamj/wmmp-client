/* global window, Promise, Storage, File, FileReader */

import jsonClient from 'json-client';
import { Checkin, Location, ParsedFile, Place } from './_types';

type Status = 'up_to_date' | 'waiting' | 'sending';

const api = jsonClient('/api/monopoly');

export default class CheckinManager {
	_teamId: number;
	_queuedCheckins: Checkin[];
	_isSending: boolean = false;

	constructor(teamId: number, queuedCheckins: Checkin[] = []) {
		this._teamId = teamId;
		this._queuedCheckins = queuedCheckins;
		this._save();
	}

	static load(): CheckinManager|null {
		const json = localStorage().getItem('gameState');

		if (!json)
			return null;

		let obj;

		try {
			obj = JSON.parse(json);
		} catch (e) {
			throw new Error('invalid existing state');
		}

		const { teamId, queuedCheckins } = obj;

		return new CheckinManager(teamId, queuedCheckins);
	}

	_save() {
		const obj = {
			teamId: this._teamId,
			queuedCheckins: this._queuedCheckins,
		};

		const json = JSON.stringify(obj);

		localStorage().setItem('gameState', json);
	}

	get teamId(): number {
		return this._teamId;
	}

	get status(): Status {
		if (!this._queuedCheckins.length)
			return 'up_to_date';

		return this._isSending ? 'sending' : 'waiting';
	}

	get pendingCheckinCount(): number {
		return this._queuedCheckins.length;
	}

	async queueCheckin(place: Place, location: Location|null, file: File) {
		const dateTime = new Date().toISOString();
		const randomNum = Math.floor(Math.random() * (2 ** 32));
		const randomStr = randomNum.toString(16).padStart(8, '0');
		const photo = await parseFile(file);

		this._queuedCheckins.push({
			idempotencyKey: `${dateTime}-${randomStr}`,
			placeId: place.id,
			location,
			dateTime,
			photo,
		});

		this._save();
		this.trySending();
	}

	async trySending() {
		// prevent multiple instances of this function running in parallel
		if (this._isSending)
			return;

		this._isSending = true;

		try {
			await this._sendAll();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
		} finally {
			this._isSending = false;
		}
	}

	async _sendAll(): Promise<void> {
		for (const checkin of this._queuedCheckins) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await this._sendCheckin(checkin);

				// check index now, as array may have mutated
				const idx = this._queuedCheckins.indexOf(checkin);

				this._queuedCheckins.splice(idx, 1);
				this._save();
			} catch (error) {
				// eslint-disable-next-line no-console
				console.warn(error);
			}
		}
	}

	async _sendCheckin(checkin: Checkin): Promise<void> {
		const path = `teams/${encodeURIComponent(this._teamId)}/checkin`;
		const body = transformCheckin(checkin);

		await api('post', path, null, body);
	}
}

function localStorage(): Storage {
	if ('localStorage' in window)
		return window.localStorage;

	throw new Error('localStorage not available');
}

async function parseFile(file: File): Promise<ParsedFile> {
	if (!file)
		throw new Error('invalid file');

	const result = await new Promise((resolve, reject) => {
		const fr = new FileReader();

		fr.onerror = e => reject(e.target.error);
		fr.onload = () => resolve(fr.result);

		fr.readAsDataURL(file);
	});

	const afterStr = 'base64,';
	const idx = result.indexOf(afterStr) + afterStr.length;
	const base64 = result.substr(idx);

	return {
		fileName: file.name,
		mimeType: file.type,
		base64Data: base64,
	};
}

function transformCheckin(checkin: Checkin): {} {
	return {
		idempotency_key: checkin.idempotencyKey,
		location_id: checkin.placeId,
		client_time: checkin.dateTime,
		client_location: checkin.location,
		photo: {
			file_name: checkin.photo.fileName,
			mime_type: checkin.photo.mimeType,
			base64_data: checkin.photo.base64Data,
		},
	};
}
