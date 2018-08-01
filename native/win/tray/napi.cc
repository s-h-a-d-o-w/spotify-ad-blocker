#include <node_api.h>

#include <queue>
#include <cstdio>

#include <chrono>
#include <thread>
#include <mutex>

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


// Maps ids to menu items so that they can be return in click callback
struct itemmap {
	napi_ref id;
	tray_menu* item;
};


// GLOBAL VARIABLES
// ===============================================
napi_value undefined;
napi_threadsafe_function threadSafeCallback;

tray nodeTray;
tray_menu* items;
uint32_t numItems;
itemmap* imap;

std::mutex mtx;
std::condition_variable cv;
std::queue<tray_menu*> eventQueue;
// ===============================================


// Triggered from inside tray.h
void onClick(tray_menu* item) {
	eventQueue.push(item);
	cv.notify_all();
}

// Bridge between onClick() and the JS click event handler provided to create()
void threadSafeCallbackImpl(napi_env env, napi_value js_callback, void* context, void* data) {
	itemmap mapEntry = imap[*(int*)data];

	napi_value cbArguments[1];
	NAPI_CALL_RETURN_VOID(env, napi_get_reference_value(env, mapEntry.id, &(cbArguments[0])));

	// Construct return object
	napi_value retval[1];
	NAPI_CALL_RETURN_VOID(env, napi_create_object(env, &(retval[0])));
	NAPI_CALL_RETURN_VOID(env, napi_set_named_property(env, retval[0], "wrappedId", cbArguments[0]));

	napi_value text;
	napi_value enabled;
	napi_value checked;
	napi_create_string_utf8(env, mapEntry.item->text, NAPI_AUTO_LENGTH, &text);
	napi_get_boolean(env, !mapEntry.item->disabled, &enabled);
	napi_get_boolean(env, mapEntry.item->checked, &checked);
	NAPI_CALL_RETURN_VOID(env, napi_set_named_property(env, retval[0], "text", text));
	NAPI_CALL_RETURN_VOID(env, napi_set_named_property(env, retval[0], "enabled", enabled));
	NAPI_CALL_RETURN_VOID(env, napi_set_named_property(env, retval[0], "checked", checked));


	NAPI_CALL_RETURN_VOID(env, napi_call_function(env, undefined, js_callback, 1, retval, NULL));
}


// THREADS
// ================================================================================
void asyncTrayEvents(napi_env env, void* pData) {
	while(true) {
		std::unique_lock<std::mutex> lck(mtx);
		cv.wait(lck, []{ return !eventQueue.empty(); });

		while(!eventQueue.empty()) {
			tray_menu* item = eventQueue.front();
			eventQueue.pop();

			int found = -1;
			for(int i = 0; i < numItems; i++) {
				if(imap[i].item == item) {
					found = i;
					break;
				}
			}

			NAPI_CALL_RETURN_VOID(env, napi_call_threadsafe_function(threadSafeCallback,
                              &found, napi_tsfn_blocking));
		}
	}
}


void asyncTrayCreation(napi_env env, void* pData) {
	tray_init((tray*)pData);

	while(tray_loop(1) == 0) { }
}
// ================================================================================


// EXPORTED FUNCTIONS
// =============================================================================================
napi_value create(napi_env env, napi_callback_info info) {
	// Get caller arguments
	size_t argc = 4;
	napi_value args[4];
	NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

	// Extract individual arguments
	// (If the user doesn't supply the correct ones, NAPI_CALL will throw an error and return)
	char* icon;
	size_t lenIcon;
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], NULL, 0, &lenIcon));
	icon = new char[lenIcon + 1];
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], icon, lenIcon + 1, &lenIcon));

	char* tooltip;
	size_t lenTooltip;
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[1], NULL, 0, &lenTooltip));
	tooltip = new char[lenTooltip + 1];
	NAPI_CALL(env, napi_get_value_string_utf8(env, args[1], tooltip, lenTooltip + 1, &lenTooltip));


	NAPI_CALL(env, napi_get_array_length(env, args[2], &numItems));
	items = new tray_menu[numItems + 1];
	imap = new itemmap[numItems];
	for(int i = 0; i < numItems; i++) {
		napi_value n_item;
		NAPI_CALL(env, napi_get_element(env, args[2], i, &n_item));

		napi_value n_id;
		napi_value n_text;
		napi_value n_enabled;
		napi_value n_checked;
		NAPI_CALL(env, napi_get_named_property(env, n_item, "wrappedId", &n_id));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "text", &n_text));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "enabled", &n_enabled));
		NAPI_CALL(env, napi_get_named_property(env, n_item, "checked", &n_checked));

		size_t lenTitle;
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, NULL, 0, &lenTitle));
		items[i].text = new char[lenTitle + 1];
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, items[i].text, lenTitle + 1, &lenTitle));

		bool enabled;
		bool checked;
		NAPI_CALL(env, napi_get_value_bool(env, n_enabled, &enabled));
		NAPI_CALL(env, napi_get_value_bool(env, n_checked, &checked));
		items[i].disabled = !enabled;
		items[i].checked = checked;

		items[i].cb = onClick;
		items[i].context = NULL;
		items[i].submenu = NULL;

		// Map id to current item for later use. Reference is needed so that the memory isn't freed.
		NAPI_CALL(env, napi_create_reference(env, n_id, 1, &(imap[i].id)));
		imap[i].item = &items[i];
	}

	// Last item - NULL item
	items[numItems].text = NULL;


	// Setup and queue our async work
	// There are no complete functions because these threads will run permanently
	nodeTray.icon = icon;
	nodeTray.tooltip = tooltip;
	nodeTray.menu = items;

	napi_async_work workCreation;
	napi_value workNameCreation;

	napi_create_string_utf8(env, "work:tray:mainloop", NAPI_AUTO_LENGTH, &workNameCreation);
	NAPI_CALL(env, napi_create_async_work(env, NULL, workNameCreation, asyncTrayCreation, NULL, &nodeTray, &workCreation));

	NAPI_CALL(env, napi_queue_async_work(env, workCreation));


	napi_async_work workEvents;
	napi_value workNameEvents;
	napi_create_string_utf8(env, "work:tray:events", NAPI_AUTO_LENGTH, &workNameEvents);
	NAPI_CALL(env, napi_create_async_work(env, NULL, workNameEvents, asyncTrayEvents, NULL, NULL, &workEvents));

	NAPI_CALL(env, napi_queue_async_work(env, workEvents));


	// Hook up click callback function in a way that it can be called from the work:tray:events thread
	// Added in node v10.6.0
	napi_value async_resource_name;
	napi_create_string_utf8(env, "threadsafe:clickcallback", NAPI_AUTO_LENGTH, &async_resource_name);
	NAPI_CALL(env, napi_create_threadsafe_function(env, args[3], NULL, async_resource_name, 0, 1,
		NULL, NULL, NULL, threadSafeCallbackImpl, &threadSafeCallback));

	return undefined;
}

napi_value update(napi_env env, napi_callback_info info) {
	// Get caller arguments
	size_t argc = 1;
	napi_value args[1];
	NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

	// Find item to update
	napi_value n_id;
	NAPI_CALL(env, napi_get_named_property(env, args[0], "wrappedId", &n_id));

	int found = -1;
	bool isEqual;
	for(int i = 0; i < numItems; i++) {
		napi_value currId;
		NAPI_CALL(env, napi_get_reference_value(env, imap[i].id, &currId));

		NAPI_CALL(env, napi_strict_equals(env, currId, n_id, &isEqual));
		if(isEqual) {
			found = i;
			break;
		}
	}

	if(found > -1) {
		napi_value n_text;
		napi_value n_enabled;
		napi_value n_checked;
		NAPI_CALL(env, napi_get_named_property(env, args[0], "text", &n_text));
		NAPI_CALL(env, napi_get_named_property(env, args[0], "enabled", &n_enabled));
		NAPI_CALL(env, napi_get_named_property(env, args[0], "checked", &n_checked));


		size_t lenTitle;
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, NULL, 0, &lenTitle));
		delete[] items[found].text;
		items[found].text = new char[lenTitle + 1];
		NAPI_CALL(env, napi_get_value_string_utf8(env, n_text, items[found].text, lenTitle + 1, &lenTitle));

		bool enabled;
		bool checked;
		NAPI_CALL(env, napi_get_value_bool(env, n_enabled, &enabled));
		NAPI_CALL(env, napi_get_value_bool(env, n_checked, &checked));
		items[found].disabled = !enabled;
		items[found].checked = checked;


		tray_update(&nodeTray);
	}
	else {
		NAPI_CALL(env, napi_throw_error(env, "N-API", "Tray item for provided id could not be found."));
	}

	return undefined;
}

napi_value exit(napi_env env, napi_callback_info info) {
	tray_exit();
	delete[] imap;
	delete[] items;
	return undefined;
}
// =============================================================================================

napi_value init(napi_env env, napi_value exports) {
	NAPI_CALL(env, napi_get_undefined(env, &undefined));

	// Export functions
	napi_value fnCreate;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, create, NULL, &fnCreate));
	NAPI_CALL(env, napi_set_named_property(env, exports, "create", fnCreate));

	napi_value fnUpdate;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, update, NULL, &fnUpdate));
	NAPI_CALL(env, napi_set_named_property(env, exports, "update", fnUpdate));

	napi_value fnExit;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, exit, NULL, &fnExit));
	NAPI_CALL(env, napi_set_named_property(env, exports, "exit", fnExit));

	return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
