async function quickCapture(tab) {
  const settings = await chrome.storage.sync.get({
    endpoint: 'http://localhost:3000/api/v1/capture',
    token: 'local-capture-token',
    boardId: '',
    ownerId: '',
  });

  if (!settings.boardId || !settings.ownerId) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Personal Kanban',
      message: 'Set board and owner IDs in the extension options.',
    });
    return;
  }

  const text = `${tab.title ?? ''} ${tab.url ?? ''}`.trim();

  await fetch(settings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-capture-token': settings.token,
    },
    body: JSON.stringify({
      ownerId: settings.ownerId,
      boardId: settings.boardId,
      text,
      source: 'browser-extension',
    }),
  });
}

chrome.action.onClicked.addListener((tab) => {
  quickCapture(tab).catch((error) => console.error('Capture failed', error));
});
