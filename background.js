browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'mynotefoxy-send',
    title: 'Enviar para MyNoteFoxy',
    contexts: ['selection']
  });
});

browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'mynotefoxy-send' && info.selectionText) {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const snippet = `> 📎 _Recebido em ${date} às ${time}_\n> ${info.selectionText}\n\n`;

    browser.storage.local.get('content').then((result) => {
      const content = (result.content || '') + snippet;
      return browser.storage.local.set({ content });
    });
  }
});
