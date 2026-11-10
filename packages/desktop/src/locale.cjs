const portuguese = {
  "Opening HomeLedger": "Abrindo o HomeLedger",
  "Preparing your local workspace…": "Preparando seus dados locais…",
  "Open this link in your browser?": "Abrir este link no navegador?",
  "Cancel": "Cancelar",
  "Open browser": "Abrir navegador",
  "The saved local port is in use. Close the conflicting application and retry. HomeLedger will never connect to another server.": "A porta local salva está em uso. Feche o aplicativo que está usando a porta e tente novamente. O HomeLedger nunca se conectará a outro servidor.",
  "These data were opened by a newer version. Install that version or restore a compatible backup. Your files have not been deleted.": "Estes dados foram abertos por uma versão mais recente. Instale essa versão ou restaure um backup compatível. Seus arquivos não foram excluídos.",
  "The local service stopped unexpectedly. Retry to restart it. Your saved data have not been deleted.": "O serviço local parou inesperadamente. Tente novamente para reiniciá-lo. Seus dados salvos não foram excluídos.",
  "The application window stopped unexpectedly. Retry to reopen it. Unsaved changes may need to be entered again.": "A janela do aplicativo parou inesperadamente. Tente novamente para reabri-la. Talvez seja necessário inserir novamente as alterações não salvas.",
  "Your local workspace could not be opened. Check free disk space and folder permissions. Your data have not been deleted.": "Não foi possível abrir seus dados locais. Verifique o espaço livre em disco e as permissões da pasta. Seus dados não foram excluídos.",
  "HomeLedger could not continue": "O HomeLedger não pôde continuar",
  "Retry": "Tentar novamente",
  "Open data folder": "Abrir pasta de dados",
  "Quit": "Sair",
  "Save file": "Salvar arquivo",
  "File": "Arquivo",
  "Open logs": "Abrir registros",
  "Back": "Voltar",
  "Return to HomeLedger": "Voltar ao HomeLedger",
  "About HomeLedger": "Sobre o HomeLedger",
  "Your data are stored on this computer. Background tasks run while the app is open. Update manually from GitHub Releases.": "Seus dados são armazenados neste computador. As tarefas em segundo plano são executadas enquanto o aplicativo está aberto. Atualize manualmente pelo GitHub Releases.",
  "Documentation": "Documentação",
  "Could not initialize HomeLedger. Check folder permissions.": "Não foi possível iniciar o HomeLedger. Verifique as permissões da pasta.",
  "Edit": "Editar",
  "View": "Exibir",
  "Window": "Janela",
  "Help": "Ajuda",
  "Undo": "Desfazer",
  "Redo": "Refazer",
  "Cut": "Recortar",
  "Copy": "Copiar",
  "Paste": "Colar",
  "Select all": "Selecionar tudo",
  "Minimize": "Minimizar",
  "Close": "Fechar",
  "Actual size": "Tamanho real",
  "Zoom in": "Ampliar",
  "Zoom out": "Reduzir",
  "Full screen": "Tela cheia",
  "Services": "Serviços",
  "Hide HomeLedger": "Ocultar HomeLedger",
  "Hide others": "Ocultar outros",
  "Show all": "Mostrar tudo"
};

function resolveLocale(value) {
  const normalized = String(value || '').toLowerCase().replace('_', '-');
  if (normalized === 'pt' || normalized === 'pt-br') return 'pt-BR';
  return normalized.startsWith('es') ? 'es' : 'en';
}
function text(locale, en, es) {
  return locale === 'pt-BR' ? (portuguese[en] ?? en) : locale === 'es' ? es : en;
}
module.exports = { resolveLocale, text, portuguese };
