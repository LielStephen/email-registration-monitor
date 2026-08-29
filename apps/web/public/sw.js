self.addEventListener('push', (event) => {
  const payload = event.data?.json() || { title: 'Registration Monitor', body: 'A new match was found.' };
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, data: { matchId: payload.matchId } }));
});
