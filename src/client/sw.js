console.log('Started', self);
self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('Installed', event);
});
self.addEventListener('activate', function(event) {
  console.log('Activated', event);
});
self.addEventListener('push', function(event) {
  console.log('Push message received', event);

  event.waitUntil(
    self.registration.showNotification('Fello', {
      body: 'A Friend of yours published a new message',
      icon: '/images/logo.png',
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  console.log('notificationclick', event.notification);
});

self.addEventListener('notificationclose', function(event) {
  console.log('notificationclose', event.notification);
});
