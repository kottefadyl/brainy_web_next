self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = {}; }
  const data = payload.data ?? {};
  const notification = payload.notification ?? {};
  event.waitUntil(self.registration.showNotification(notification.title ?? "Brainy reminder", {
    body: notification.body ?? data.body ?? "",
    tag: data.key ?? payload.message_id ?? "brainy-reminder",
    data: { url: self.registration.scope },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.registration.scope));
    if (existing) return existing.focus();
    return self.clients.openWindow(self.registration.scope);
  }));
});
