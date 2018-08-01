#include <node_api.h>

#include <cstdio>

#include "spotify.h"

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

// ASYNC STUFF
// ===============================================
struct AsyncData {
	napi_deferred deferred;
	napi_async_work work;

	// IN
	//bool refreshProcess;
	int pid;

	// OUT
	int adPlaying;
};

void execute(napi_env env, void* pData) {
	AsyncData* data = (AsyncData*)pData;

	data->adPlaying = isAdPlaying(data->pid);
}

void complete(napi_env env, napi_status status, void* pData) {
	AsyncData* data = (AsyncData*)pData;

	if(data->adPlaying < 2) {
		napi_value adStatus;
		napi_get_boolean(env, data->adPlaying == 1, &adStatus);

		// Resolve Promise
		NAPI_CALL_RETURN_VOID(env, napi_resolve_deferred(env, data->deferred, adStatus));
	}
	else {
		// Reject Promise
		napi_value error;
		napi_create_string_utf8(env, "Could not get Spotify ad status! (Is Spotify running?)", NAPI_AUTO_LENGTH, &error);

		NAPI_CALL_RETURN_VOID(env, napi_reject_deferred(env, data->deferred, error));
	}

	// Cleanup
	NAPI_CALL_RETURN_VOID(env, napi_delete_async_work(env, data->work));
	delete data;
}
// ===============================================


// Sets up the call to volumectrl.mute to be async
napi_value asyncIsAdPlaying(napi_env env, napi_callback_info info) {
	// Create promise
	napi_deferred deferred;
	napi_value promise;
	NAPI_CALL(env, napi_create_promise(env, &deferred, &promise));

	size_t argc = 1;
	napi_value args[1];
	NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

	// Extract individual arguments
	// (If the user doesn't supply the correct ones, NAPI_CALL will throw an error and return)
//	bool refreshProcess;
//	NAPI_CALL(env, napi_get_value_bool(env, args[0], &refreshProcess));
	int pid;
	NAPI_CALL(env, napi_get_value_int32(env, args[0], &pid));

	// Setup and queue our async work
	napi_async_work work;
	napi_value workName;

	AsyncData* data = new AsyncData;
	data->deferred = deferred;
//	data->refreshProcess = refreshProcess;
	data->pid = pid;

	napi_create_string_utf8(env, "work:isadplaying", NAPI_AUTO_LENGTH, &workName);
	NAPI_CALL(env, napi_create_async_work(env, NULL, workName, execute, complete, data, &work));

	// This has to happen after napi_create_async_work!
	data->work = work;

	NAPI_CALL(env, napi_queue_async_work(env, work));

	return promise;
}

napi_value init(napi_env env, napi_value exports) {
	NAPI_CALL(env, napi_get_undefined(env, &undefined));

	// Export native function
	napi_value fn;
	NAPI_CALL(env, napi_create_function(env, NULL, 0, asyncIsAdPlaying, NULL, &fn));
	NAPI_CALL(env, napi_set_named_property(env, exports, "isAdPlaying", fn));

	return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
