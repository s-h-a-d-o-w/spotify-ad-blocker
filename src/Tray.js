const EventEmitter = require('events');
const tray = require('bindings')('tray');

class Tray extends EventEmitter {
	addDefaults(item) {
		return Object.assign({
			text: '',
			enabled: true,
			checked: false,
		}, item);
	}

	click(item) {
		this.emit('click', this.unwrapId(item));
	}

	constructor(opts) {
		super();

		let icon = opts.icon,
			items = opts.items,
			tooltip = opts.tooltip || "";

		// The IDs the user passes in are mostly just for their convenience, the native addon
		// uses references to objects that are not allowed to change.
		// These objects are based on the IDs the user provides. The structure looks like this:
		// let FOO = Symbol()
		// item: { id: FOO, text: '...', [...] }
		// Which we use for identification like so:
		// this.wrappedIds[FOO] = { id: FOO }
		this.wrappedIds = {};

		if(icon && items && items.length > 0) {
			// Enforce unique IDs
			let cntIds = {};
			items.forEach((item) => {
				if(cntIds.hasOwnProperty(item.id))
					throw('IDs must be unique!');
				else
					cntIds[item.id] = 1;
			});

			// Prep items with default values and wrapping their IDs
			items = items.map((item) => {
				if(!item.hasOwnProperty('id'))
					throw('All items have to have the property "id".');
				else {
					item = this.addDefaults(item);

					this.wrappedIds[item.id] = {
						id: item.id
					};

					return this.wrapId(item);
				}
			});

			tray.create(icon, tooltip || "", items, this.click.bind(this));
		}
		else {
			throw('tray: An icon and at least one item have to be provided.');
		}
	}

	destroy() {
		tray.exit();
	}

	// The whole id wrapping unfortunately is necessary to enable using <any> type
	// for it, since we need to keep persistent references inside the native code and there are only
	// references to objects.

	// Wrapping object has to stay the same object throughout!
	unwrapId(item) {
		item.id = item.wrappedId.id;
		delete item.wrappedId;
		return item;
	}

	update(item) {
		tray.update(this.wrapId(item));
	}

	wrapId(item) {
		item.wrappedId = this.wrappedIds[item.id];
		delete item.id;
		return item;
	}
}

/*
// TEST
const FIRST_ITEM = Symbol();
const EXIT = Symbol();

const myTray = new Tray({
	icon: './assets/spotify-ad-blocker.ico',
	items: [{
		id: FIRST_ITEM,
		text: 'Schön',
		enabled: true,
		checked: true,
	}, {
		id: EXIT,
		text: 'Exit',
		enabled: true,
		checked: false,
	}],
	tooltip: `Was ur lange was sicher länger als 128 Zeichen ist.Was ur lange was sicher länger als 128 Zeichen ist.Was ur lange was sicher länger als 128 Zeichen ist.
Was ur lange was sicher länger als 128 Zeichen ist.Was ur lange was sicher länger als 128 Zeichen ist.`,
});

// item is a shallow copy - id can still be compared to e.g. symbol but booleans can be safely toggled.
myTray.on('click', function(item) {
	console.log(this);
	console.log(item);

	if(item.id && item.id === FIRST_ITEM) {
		console.log('FIRST');
		try {
			item.checked = !item.checked;
			this.update(item);
		}
		catch(e) {
			console.log(e);
		}
	}
	else if(item.id === EXIT) {
		this.destroy();
		process.exit(0);
	}
});
*/


module.exports = Tray;
