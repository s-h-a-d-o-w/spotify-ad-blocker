//Based on: https://github.com/zserge/tray/blob/master/tray.h

/*
MIT License

Original work Copyright (c) 2017 Serge Zaitsev
Modified work Copyright (c) 2018 Andreas Opferkuch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#ifndef TRAY_H
#define TRAY_H


#define TRAY_WINAPI 1


struct tray_menu;

struct tray {
  char *icon;
  char *tooltip;
  struct tray_menu *menu;
};

struct tray_menu {
  char *text;
  int disabled;
  int checked;

  void (*cb)(struct tray_menu *);
  void *context;

  struct tray_menu *submenu;
};

static void tray_update(struct tray *tray);

#if defined(TRAY_APPINDICATOR)

#include <gtk/gtk.h>
#include <libappindicator/app-indicator.h>

#define TRAY_APPINDICATOR_ID "tray-id"

static AppIndicator *indicator = NULL;
static int loop_result = 0;

static void _tray_menu_cb(GtkMenuItem *item, gpointer data) {
  (void)item;
  struct tray_menu *m = (struct tray_menu *)data;
  m->cb(m);
}

static GtkMenuShell *_tray_menu(struct tray_menu *m) {
  GtkMenuShell *menu = (GtkMenuShell *)gtk_menu_new();
  for (; m != NULL && m->text != NULL; m++) {
    GtkWidget *item;
    if (strcmp(m->text, "-") == 0) {
      item = gtk_separator_menu_item_new();
    } else {
      if (m->submenu != NULL) {
        item = gtk_menu_item_new_with_label(m->text);
        gtk_menu_item_set_submenu(GTK_MENU_ITEM(item),
                                  GTK_WIDGET(_tray_menu(m->submenu)));
      } else {
        item = gtk_check_menu_item_new_with_label(m->text);
        gtk_check_menu_item_set_active(GTK_CHECK_MENU_ITEM(item), !!m->checked);
      }
      gtk_widget_set_sensitive(item, !m->disabled);
      if (m->cb != NULL) {
        g_signal_connect(item, "activate", G_CALLBACK(_tray_menu_cb), m);
      }
    }
    gtk_widget_show(item);
    gtk_menu_shell_append(menu, item);
  }
  return menu;
}

static int tray_init(struct tray *tray) {
  if (gtk_init_check(0, NULL) == FALSE) {
    return -1;
  }
  indicator = app_indicator_new(TRAY_APPINDICATOR_ID, tray->icon,
                                APP_INDICATOR_CATEGORY_APPLICATION_STATUS);
  app_indicator_set_status(indicator, APP_INDICATOR_STATUS_ACTIVE);
  tray_update(tray);
  return 0;
}

static int tray_loop(int blocking) {
  gtk_main_iteration_do(blocking);
  return loop_result;
}

static void tray_update(struct tray *tray) {
  app_indicator_set_icon(indicator, tray->icon);
  // GTK is all about reference counting, so previous menu should be destroyed
  // here
  app_indicator_set_menu(indicator, GTK_MENU(_tray_menu(tray->menu)));
}

static void tray_exit() { loop_result = -1; }

#elif defined(TRAY_APPKIT)

#import <Cocoa/Cocoa.h>

static NSAutoreleasePool *pool;
static NSStatusBar *statusBar;
static id statusItem;
static id statusBarButton;

@interface Tray : NSObject <NSApplicationDelegate>
- (void)menuCallback:(id)sender;
@end
@implementation Tray
- (void)menuCallback:(id)sender {
  struct tray_menu *m =
      (struct tray_menu *)[[sender representedObject] pointerValue];
  if (m != NULL && m->cb != NULL) {
    m->cb(m);
  }
}
@end

static NSMenu *_tray_menu(struct tray_menu *m) {
  NSMenu *menu = [NSMenu new];
  [menu autorelease];
  [menu setAutoenablesItems:NO];
  for (; m != NULL && m->text != NULL; m++) {
    if (strcmp(m->text, "-") == 0) {
      [menu addItem:[NSMenuItem separatorItem]];
    } else {
      NSMenuItem *menuItem = [NSMenuItem alloc];
      [menuItem autorelease];
      [menuItem initWithTitle:[NSString stringWithUTF8String:m->text]
                       action:@selector(menuCallback:)
                keyEquivalent:@""];
      [menuItem setEnabled:(m->disabled ? NO : YES)];
      [menuItem setState:(m->checked ? NSOnState : NSOffState)];
      [menuItem setRepresentedObject:[NSValue valueWithPointer:m]];

      [menu addItem:menuItem];

      if (m->submenu != NULL) {
        [menu setSubmenu:_tray_menu(m->submenu) forItem:menuItem];
      }
    }
  }
  return menu;
}

static int tray_init(struct tray *tray) {
  pool = [NSAutoreleasePool new];
  [NSApplication sharedApplication];

  Tray *trayDelegate = [Tray new];
  [NSApp setDelegate:trayDelegate];

  statusBar = [NSStatusBar systemStatusBar];
  statusItem = [statusBar statusItemWithLength:NSVariableStatusItemLength];
  [statusItem retain];
  [statusItem setHighlightMode:YES];
  statusBarButton = [statusItem button];

  tray_update(tray);
  [NSApp activateIgnoringOtherApps:YES];
  return 0;
}

static int tray_loop(int blocking) {
  NSEvent *event;
  NSDate *until = (blocking ? [NSDate distantFuture] : [NSDate distantPast]);
  event = [NSApp nextEventMatchingMask:NSAnyEventMask
                             untilDate:until
                                inMode:NSDefaultRunLoopMode
                               dequeue:YES];
  if (event) {
    [NSApp sendEvent:event];
  }
  return 0;
}

static void tray_update(struct tray *tray) {
  [statusBarButton
      setImage:[NSImage imageNamed:[NSString stringWithUTF8String:tray->icon]]];

  [statusItem setMenu:_tray_menu(tray->menu)];
}

static void tray_exit() { [NSApp terminate:NSApp]; }

#elif defined(TRAY_WINAPI)
#define UNICODE
#define _UNICODE

#include <windows.h>

#include <shellapi.h>

#define WM_TRAY_CALLBACK_MESSAGE (WM_USER + 1)
#define WC_TRAY_CLASS_NAME L"TRAY"
#define ID_TRAY_FIRST 1000

static WNDCLASSEX wc;
static NOTIFYICONDATA nid;
static HWND hwnd;
static HMENU hmenu = NULL;

// Based on: https://stackoverflow.com/a/6693107/5040168
//
// NOTE: Call free() on the returned string when you're done!
wchar_t* toWide(char* str) {
  int wchars_num = MultiByteToWideChar(CP_UTF8, 0, str, -1, NULL, 0);

  wchar_t* wstr = (wchar_t*)malloc(sizeof(wchar_t) * wchars_num);
  MultiByteToWideChar(CP_UTF8, 0, str, -1, wstr, wchars_num);

  return wstr;
}

static LRESULT CALLBACK _tray_wnd_proc(HWND hwnd, UINT msg, WPARAM wparam,
                                       LPARAM lparam) {
  switch (msg) {
  case WM_CLOSE:
    DestroyWindow(hwnd);
    return 0;
  case WM_DESTROY:
    PostQuitMessage(0);
    return 0;
  case WM_TRAY_CALLBACK_MESSAGE:
    if (lparam == WM_LBUTTONUP || lparam == WM_RBUTTONUP) {
      POINT p;
      GetCursorPos(&p);
      SetForegroundWindow(hwnd);
      WORD cmd = TrackPopupMenu(hmenu, TPM_LEFTALIGN | TPM_RIGHTBUTTON |
                                           TPM_RETURNCMD | TPM_NONOTIFY,
                                p.x, p.y, 0, hwnd, NULL);
      SendMessage(hwnd, WM_COMMAND, cmd, 0);
      return 0;
    }
    break;
  case WM_COMMAND:
    if (wparam >= ID_TRAY_FIRST) {
      // @s-h-a-d-o-w: No C99 for node-gyp on Windows => no designated initializers
      MENUITEMINFO item = {
        sizeof(MENUITEMINFO), MIIM_ID | MIIM_DATA, 0, 0, 0, 0, 0, 0, 0, 0, 0
      };
      if (GetMenuItemInfo(hmenu, wparam, FALSE, &item)) {
        struct tray_menu *menu = (struct tray_menu *)item.dwItemData;
        if (menu != NULL && menu->cb != NULL) {
          menu->cb(menu);
        }
      }
      return 0;
    }
    break;
  }
  return DefWindowProc(hwnd, msg, wparam, lparam);
}

static HMENU _tray_menu(struct tray_menu *m, UINT *id) {
  HMENU hmenu = CreatePopupMenu();
  for (; m != NULL && m->text != NULL; m++, (*id)++) {
    if (strcmp(m->text, "-") == 0) {
      InsertMenu(hmenu, *id, MF_SEPARATOR, TRUE, L"");
    } else {
      MENUITEMINFO item;
      memset(&item, 0, sizeof(item));
      item.cbSize = sizeof(MENUITEMINFO);
      item.fMask = MIIM_ID | MIIM_TYPE | MIIM_STATE | MIIM_DATA;
      item.fType = 0;
      item.fState = 0;
      if (m->submenu != NULL) {
        item.fMask = item.fMask | MIIM_SUBMENU;
        item.hSubMenu = _tray_menu(m->submenu, id);
      }
      if (m->disabled) {
        item.fState |= MFS_DISABLED;
      }
      if (m->checked) {
        item.fState |= MFS_CHECKED;
      }
      item.wID = *id;

      wchar_t* text = toWide(m->text);
      item.dwTypeData = text;
      item.dwItemData = (ULONG_PTR)m;

      InsertMenuItem(hmenu, *id, TRUE, &item);
      free(text);
    }
  }
  return hmenu;
}

static int tray_init(struct tray *tray) {
  memset(&wc, 0, sizeof(wc));
  wc.cbSize = sizeof(WNDCLASSEX);
  wc.lpfnWndProc = _tray_wnd_proc;
  wc.hInstance = GetModuleHandle(NULL);
  wc.lpszClassName = WC_TRAY_CLASS_NAME;
  if (!RegisterClassEx(&wc)) {
    return -1;
  }

  hwnd = CreateWindowEx(0, WC_TRAY_CLASS_NAME, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  if (hwnd == NULL) {
    return -1;
  }
  UpdateWindow(hwnd);

  memset(&nid, 0, sizeof(nid));
  nid.cbSize = sizeof(NOTIFYICONDATA);
  nid.hWnd = hwnd;
  nid.uID = 0;
  nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
  nid.uCallbackMessage = WM_TRAY_CALLBACK_MESSAGE;
  Shell_NotifyIcon(NIM_ADD, &nid);

  tray_update(tray);
  return 0;
}

static int tray_loop(int blocking) {
  MSG msg;
  if (blocking) {
    GetMessage(&msg, NULL, 0, 0);
  } else {
    PeekMessage(&msg, NULL, 0, 0, PM_REMOVE);
  }
  if (msg.message == WM_QUIT) {
    return -1;
  }
  TranslateMessage(&msg);
  DispatchMessage(&msg);
  return 0;
}

static void tray_update(struct tray *tray) {
  HMENU prevmenu = hmenu;
  UINT id = ID_TRAY_FIRST;
  hmenu = _tray_menu(tray->menu, &id);
  SendMessage(hwnd, WM_INITMENUPOPUP, (WPARAM)hmenu, 0);

  HICON icon;
  wchar_t* iconPath = toWide(tray->icon);
  int iconsExtracted = ExtractIconEx(iconPath, 0, NULL, &icon, 1);
  if(iconsExtracted < 1) {
    printf("No icons found at: %s\n", tray->icon);
  }
  free(iconPath);
  if (nid.hIcon) {
    DestroyIcon(nid.hIcon);
  }
  nid.hIcon = icon;

  if (tray->tooltip != 0 && strlen(tray->tooltip) > 0) {
    wchar_t* wide = toWide(tray->tooltip);
    wcsncpy(nid.szTip, wide, ARRAYSIZE(nid.szTip));
    free(wide);
    nid.szTip[ARRAYSIZE(nid.szTip) - 1] = L'\0';
  }
  else {
    nid.szTip[0] = L'\0';
  }

  Shell_NotifyIcon(NIM_MODIFY, &nid);

  if (prevmenu != NULL) {
    DestroyMenu(prevmenu);
  }
}

static void tray_exit() {
  Shell_NotifyIcon(NIM_DELETE, &nid);
  if (nid.hIcon != 0) {
    DestroyIcon(nid.hIcon);
  }
  if (hmenu != 0) {
    DestroyMenu(hmenu);
  }
  PostQuitMessage(0);
  UnregisterClass(WC_TRAY_CLASS_NAME, GetModuleHandle(NULL));
}
#else
static int tray_init(struct tray *tray) { return -1; }
static int tray_loop(int blocking) { return -1; }
static void tray_update(struct tray *tray) {}
static void tray_exit();
#endif

#endif /* TRAY_H */
