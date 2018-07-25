// hello.cc using N-API
#include <node_api.h>

#include "tray.h"

// Great macros:
// https://github.com/luismreis/node-openvg/blob/7dc7a142905afcb485f4ea7da33826210d0dc066/src/node-common.h#L39
// Also e.g. (not used here):
// https://github.com/luismreis/node-openvg/blob/7dc7a142905afcb485f4ea7da33826210d0dc066/src/argchecks.h

// Empty value so that macros here are able to return NULL or void
#define NAPI_RETVAL_NOTHING // Intentionally blank #define

#define GET_AND_THROW_LAST_ERROR(env)                                        \
	do {                                                                     \
		const napi_extended_error_info *error_info;                          \
		napi_get_last_error_info((env), &error_info);                        \
		bool is_pending;                                                     \
		napi_is_exception_pending((env), &is_pending);                       \
		/* If an exception is already pending, don't rethrow it */           \
		if(!is_pending) {                                                    \
			const char* error_message = error_info->error_message != NULL ?  \
				error_info->error_message :                                  \
				"Empty error message";                                       \
			napi_throw_error((env), "N-API", error_message);                 \
		}                                                                    \
	} while(0);

#define NAPI_CALL_BASE(env, the_call, ret_val)                           \
	if((the_call) != napi_ok) {                                          \
		GET_AND_THROW_LAST_ERROR((env));                                 \
		return ret_val;                                                  \
	}

// Returns NULL if the_call doesn't return napi_ok.
#define NAPI_CALL(env, the_call)                                         \
	NAPI_CALL_BASE(env, the_call, NULL)

// Returns empty if the_call doesn't return napi_ok.
#define NAPI_CALL_RETURN_VOID(env, the_call)                             \
	NAPI_CALL_BASE(env, the_call, NAPI_RETVAL_NOTHING)


// GLOBALS
// ===============================================
napi_value undefined;
// ===============================================

/*
tray tray = {
    .icon = "icon.png",
    .menu = (struct tray_menu[]){{"Toggle me", 0, 0, toggle_cb, NULL},
                                 {"-", 0, 0, NULL, NULL},
                                 {"Quit", 0, 0, quit_cb, NULL},
                                 {NULL, 0, 0, NULL, NULL}},
};
*/

struct itemmap {
	napi_value id;
	tray_menu* item;
};

uint32_t numItems;
itemmap* imap;
napi_value cbClick;

void onClick(tray_menu* item) {
	int found = -1;
	for(int i = 0; i < numItems; i++) {
		if(imap[i].item == item) {
			found = i;
			break;
		}
	}

	napi_value argv[1] = {found == -1 ? undefined : imap[found].id}; // replace by correct id at some point

	// NOT SURE WHETHER NOT CATCHING RETURN BY USING NULL WILL WORK!!
	//napi_call_function(env, undefined, cbClick, 1, argv, NULL);
}

// Sets up the call to volumectrl.mute to be async
napi_value create(napi_env env, napi_callback_info info) {
	// Get caller arguments
	size_t argc = 3;
	napi_value args[3];
	NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

	// Extract individual arguments
	// (If the user doesn't supply the correct ones, NAPI_CALL will throw an error and return)
	char* icon;
	size_t lenIcon;
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], NULL, 0, &lenIcon));
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], icon, lenIcon, &lenIcon));

	tray_menu* items;
	NAPI_CALL(env, napi_get_array_length(env, args[1], &numItems));
	items = new tray_menu[numItems + 1];
	imap = new itemmap[numItems];
	for(int i = 0; i < numItems; i++) {
		napi_value n_item;
		NAPI_CALL(env, napi_get_element(env, args[1], i, &n_item));

		napi_value n_id;
		napi_value n_text;
		napi_value n_enabled;
		napi_value n_checked;
		NAPI_CALL(env, napi_get_named_property(env, n_item, "id", &n_id));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "text", &n_text));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "enabled", &n_enabled));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "checked", &n_checked));

		size_t lenTitle;
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, NULL, 0, &lenTitle));
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, items[i].text, lenTitle, &lenTitle));

		bool enabled;
		bool checked;
		NAPI_CALL(env, napi_get_value_bool(env, n_enabled, &enabled));
		NAPI_CALL(env, napi_get_value_bool(env, n_checked, &checked));
		items[i].disabled = !enabled;
		items[i].checked = checked;

		items[i].cb = onClick;
		items[i].context = NULL;

		// Map id to current item for later use
		imap[i].id = n_id;
		imap[i].item = &items[i];
	}

	// Last item - NULL item
	items[numItems].text = NULL;

	// Callback function has to be called using napi_call_function(env, global, add_two, argc, argv, &return_val);
	cbClick = args[2];

	tray* mytray = new tray();
	mytray->icon = icon;
	mytray->menu = items;
	tray_init(mytray);

	return undefined;
}

napi_value loop(napi_env env, napi_callback_info info) {
	tray_loop(0);

	return undefined;
}

napi_value init(napi_env env, napi_value exports) {
	NAPI_CALL(env, napi_get_undefined(env, &undefined));

	// Export native function
	napi_value fn;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, create, NULL, &fn));
	NAPI_CALL(env, napi_set_named_property(env, exports, "create", fn));

	napi_value fn2;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, loop, NULL, &fn2));
	NAPI_CALL(env, napi_set_named_property(env, exports, "loop", fn2));

	return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
